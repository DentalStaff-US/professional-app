import { describe, it, expect, vi, beforeEach } from 'vitest';

const { publicEnv } = vi.hoisted(() => ({
	publicEnv: { PUBLIC_COOKIE_DOMAIN: '.dtstaffingsolutions.com' as string | undefined }
}));
vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('$app/environment', () => ({ dev: false }));

import {
	JOB_COOKIE_NAME,
	JOB_COOKIE_MAX_AGE,
	parseJobCookie,
	normalizePublicId,
	captureJobIntent,
	readJobIntent,
	clearJobIntent
} from './jobIntent';

const ID_A = '3f1c2b9e-8a4d-4c1e-9b7a-0d2e5f6a7b8c';
const ID_B = 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d';
const NOW = new Date('2026-10-23T12:00:00.000Z');

function makeCookies(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	return {
		get: vi.fn((name: string) => store.get(name)),
		set: vi.fn((name: string, value: string) => void store.set(name, value)),
		delete: vi.fn((name: string) => void store.delete(name)),
		store
	};
}

function makeEvent(url: string, opts: { method?: string; cookies?: Record<string, string> } = {}) {
	const cookies = makeCookies(opts.cookies);
	return {
		event: {
			url: new URL(url),
			request: new Request(url, { method: opts.method ?? 'GET' }),
			cookies
		} as any,
		cookies
	};
}

beforeEach(() => {
	publicEnv.PUBLIC_COOKIE_DOMAIN = '.dtstaffingsolutions.com';
});

describe('normalizePublicId', () => {
	it('accepts a uuid and lowercases it', () => {
		expect(normalizePublicId(` ${ID_A.toUpperCase()} `)).toBe(ID_A);
	});
	it.each(['', 'abc', '123', `${ID_A}x`, "'; drop table--", ID_A.replace(/-/g, '')])(
		'rejects %j',
		(v) => expect(normalizePublicId(v)).toBeNull()
	);
});

describe('parseJobCookie', () => {
	it('parses a valid value', () => {
		const at = new Date(NOW.getTime() - 60_000).toISOString();
		expect(parseJobCookie(`${ID_A}|${at}`, NOW)).toEqual({
			publicId: ID_A,
			capturedAt: new Date(at)
		});
	});
	it('tolerates a URI-encoded separator from document.cookie', () => {
		const at = new Date(NOW.getTime() - 60_000).toISOString();
		expect(parseJobCookie(`${ID_A}%7C${encodeURIComponent(at)}`, NOW)?.publicId).toBe(ID_A);
	});
	it('rejects missing, malformed, future and expired values', () => {
		expect(parseJobCookie(undefined, NOW)).toBeNull();
		expect(parseJobCookie(ID_A, NOW)).toBeNull();
		expect(parseJobCookie(`${ID_A}|nope`, NOW)).toBeNull();
		expect(parseJobCookie(`not-a-uuid|${NOW.toISOString()}`, NOW)).toBeNull();
		expect(parseJobCookie(`${ID_A}|${NOW.toISOString()}|x`, NOW)).toBeNull();
		expect(
			parseJobCookie(`${ID_A}|${new Date(NOW.getTime() + 60_000).toISOString()}`, NOW)
		).toBeNull();
		const expired = new Date(NOW.getTime() - (JOB_COOKIE_MAX_AGE + 1) * 1000).toISOString();
		expect(parseJobCookie(`${ID_A}|${expired}`, NOW)).toBeNull();
	});
	it('rejects malformed percent-encoding instead of throwing', () => {
		expect(parseJobCookie('%E0%A4%A', NOW)).toBeNull();
	});
});

describe('captureJobIntent', () => {
	it('writes the cookie with shared-domain attributes', () => {
		const { event, cookies } = makeEvent(`https://app.test/auth/sign-up?job=${ID_A}&ref=ABCD`);
		captureJobIntent(event, NOW);
		expect(cookies.set).toHaveBeenCalledTimes(1);
		const [name, value, opts] = cookies.set.mock.calls[0] as unknown as [string, string, any];
		expect(name).toBe(JOB_COOKIE_NAME);
		expect(value).toBe(`${ID_A}|${NOW.toISOString()}`);
		expect(opts).toMatchObject({
			path: '/',
			maxAge: JOB_COOKIE_MAX_AGE,
			sameSite: 'lax',
			httpOnly: false,
			secure: true,
			domain: '.dtstaffingsolutions.com'
		});
		// `|` must not be URI-encoded on the way out.
		expect(opts.encode('a|b')).toBe('a|b');
	});

	it('omits domain when PUBLIC_COOKIE_DOMAIN is unset', () => {
		publicEnv.PUBLIC_COOKIE_DOMAIN = undefined;
		const { event, cookies } = makeEvent(`https://app.test/?job=${ID_A}`);
		captureJobIntent(event, NOW);
		expect((cookies.set.mock.calls[0] as any)[2]).not.toHaveProperty('domain');
	});

	it('last touch wins: a different job overwrites a valid existing cookie', () => {
		const old = new Date(NOW.getTime() - 3600_000).toISOString();
		const { event, cookies } = makeEvent(`https://app.test/?job=${ID_B}`, {
			cookies: { [JOB_COOKIE_NAME]: `${ID_A}|${old}` }
		});
		captureJobIntent(event, NOW);
		expect(cookies.store.get(JOB_COOKIE_NAME)).toBe(`${ID_B}|${NOW.toISOString()}`);
	});

	it('does not rewrite when the same job is already stored', () => {
		const old = new Date(NOW.getTime() - 3600_000).toISOString();
		const { event, cookies } = makeEvent(`https://app.test/?job=${ID_A}`, {
			cookies: { [JOB_COOKIE_NAME]: `${ID_A}|${old}` }
		});
		captureJobIntent(event, NOW);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('ignores invalid ids and non-GET requests', () => {
		const bad = makeEvent('https://app.test/?job=not-a-uuid');
		captureJobIntent(bad.event, NOW);
		expect(bad.cookies.set).not.toHaveBeenCalled();

		const post = makeEvent(`https://app.test/auth/sign-up?job=${ID_A}`, { method: 'POST' });
		captureJobIntent(post.event, NOW);
		expect(post.cookies.set).not.toHaveBeenCalled();
	});

	it('never throws', () => {
		const { event, cookies } = makeEvent(`https://app.test/?job=${ID_A}`);
		cookies.set.mockImplementation(() => {
			throw new Error('boom');
		});
		expect(() => captureJobIntent(event, NOW)).not.toThrow();
	});
});

describe('readJobIntent / clearJobIntent', () => {
	it('reads a valid cookie', () => {
		const cookies = makeCookies({ [JOB_COOKIE_NAME]: `${ID_A}|${NOW.toISOString()}` });
		expect(readJobIntent(cookies as any, NOW)?.publicId).toBe(ID_A);
	});

	it('returns null for an invalid cookie', () => {
		expect(readJobIntent(makeCookies({ [JOB_COOKIE_NAME]: 'junk' }) as any, NOW)).toBeNull();
	});

	it('clears with the same domain and path as the writer', () => {
		const cookies = makeCookies({ [JOB_COOKIE_NAME]: `${ID_A}|${NOW.toISOString()}` });
		clearJobIntent(cookies as any);
		expect(cookies.delete).toHaveBeenCalledWith(
			JOB_COOKIE_NAME,
			expect.objectContaining({ path: '/', domain: '.dtstaffingsolutions.com' })
		);
	});
});
