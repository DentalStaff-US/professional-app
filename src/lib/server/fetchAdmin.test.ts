import { describe, it, expect, vi, beforeEach } from 'vitest';

// SvelteKit's `$env/static/public` is unresolvable in a plain node test
// runner. Stub it before importing the module under test.
vi.mock('$env/static/public', () => ({
	PUBLIC_CLIENT_APP_DOMAIN: 'https://admin.test'
}));

// Replace the logger so failing branches don't try to talk to PostHog. The
// mock surface mirrors the real `logger` API so the same import works. The
// `loggerError` spy is hoisted alongside `vi.mock` so the factory can close
// over it without hitting the temporal-dead-zone issue.
const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }));
vi.mock('$lib/server/logger', () => ({
	logger: {
		error: loggerError,
		warn: vi.fn(),
		event: vi.fn(),
		info: vi.fn()
	}
}));

import { fetchAdmin } from './fetchAdmin';

beforeEach(() => {
	vi.restoreAllMocks();
	loggerError.mockClear();
});

describe('fetchAdmin — happy path', () => {
	it('returns ok=true with parsed JSON body and status', async () => {
		const body = { data: [{ id: 1 }, { id: 2 }] };
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(body), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			)
		);

		const result = await fetchAdmin<{ data: Array<{ id: number }> }>('/api/external/foo');

		expect(result).toEqual({ ok: true, status: 200, data: body });
		expect(loggerError).not.toHaveBeenCalled();
	});

	it('sets Authorization: Bearer when token is provided', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchSpy);

		await fetchAdmin('/x', { token: 'my-token' });

		const [, init] = fetchSpy.mock.calls[0];
		expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
	});

	it('serializes object body to JSON and sets content-type', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchSpy);

		await fetchAdmin('/x', { method: 'POST', body: { a: 1 } });

		const [, init] = fetchSpy.mock.calls[0];
		expect(init.body).toBe('{"a":1}');
		expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
		expect(init.method).toBe('POST');
	});

	it('passes string body through unchanged (no JSON.stringify)', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchSpy);

		await fetchAdmin('/x', { method: 'POST', body: 'raw=value' });

		const [, init] = fetchSpy.mock.calls[0];
		expect(init.body).toBe('raw=value');
	});

	it('normalizes leading-slash vs no-leading-slash on the path', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchSpy);

		await fetchAdmin('/api/external/foo');
		await fetchAdmin('api/external/foo');

		expect(fetchSpy.mock.calls[0][0]).toBe('https://admin.test/api/external/foo');
		expect(fetchSpy.mock.calls[1][0]).toBe('https://admin.test/api/external/foo');
	});
});

describe('fetchAdmin — fail branches', () => {
	it('returns reason=network when fetch rejects', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

		const result = await fetchAdmin('/api/external/foo');

		expect(result).toMatchObject({ ok: false, reason: 'network' });
		expect(loggerError).toHaveBeenCalledOnce();
		const [message, props] = loggerError.mock.calls[0];
		expect(message).toContain('network');
		expect(props).toMatchObject({ path: '/api/external/foo', method: 'GET' });
	});

	it.each([400, 401, 403, 404, 500, 502, 503])(
		'returns reason=http for status %s',
		async (status) => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue(new Response('boom', { status }))
			);

			const result = await fetchAdmin('/api/external/foo');

			expect(result).toMatchObject({ ok: false, reason: 'http', status });
			expect(loggerError).toHaveBeenCalledOnce();
			const [, props] = loggerError.mock.calls[0];
			expect(props).toMatchObject({ status });
			// Body snippet is logged for debugging
			expect(props.body).toBe('boom');
		}
	);

	it('returns reason=parse on invalid JSON in a 200 response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response('not-json{', {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			)
		);

		const result = await fetchAdmin('/api/external/foo');

		expect(result).toMatchObject({ ok: false, reason: 'parse', status: 200 });
		expect(loggerError).toHaveBeenCalledOnce();
	});

	it('returns reason=timeout when fetch exceeds timeoutMs', async () => {
		// Stub fetch with a Promise that listens to AbortSignal. When the
		// helper aborts after timeoutMs ms, the promise rejects with an
		// AbortError, which fetchAdmin should classify as timeout.
		vi.stubGlobal(
			'fetch',
			vi.fn((_url: string, init: RequestInit) => {
				return new Promise((_, reject) => {
					init.signal?.addEventListener('abort', () => {
						reject(new DOMException('aborted', 'AbortError'));
					});
				});
			})
		);

		const result = await fetchAdmin('/api/external/foo', { timeoutMs: 20 });

		expect(result).toMatchObject({ ok: false, reason: 'timeout' });
		expect(result.error).toMatch(/timed out/i);
		expect(loggerError).toHaveBeenCalledOnce();
	});

	it('does not throw even when fetch rejects with a non-Error value', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string failure'));

		const result = await fetchAdmin('/api/external/foo');

		expect(result.ok).toBe(false);
		expect(result.error).toBe('string failure');
	});
});
