import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_COOKIE_DOMAIN: '.example.test' } }));
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$lib/server/logger', () => ({
	logger: { error: vi.fn(), warn: vi.fn(), event: vi.fn(), info: vi.fn() }
}));
vi.mock('$lib/server/utils', () => ({ generateToken: (id: string) => `token-${id}` }));

const { fetchAdmin, getCandidateStatus, flashRedirect } = vi.hoisted(() => ({
	fetchAdmin: vi.fn(),
	getCandidateStatus: vi.fn(),
	flashRedirect: vi.fn((status: number, location: string) => {
		throw { status, location, flash: true };
	})
}));
vi.mock('$lib/server/fetchAdmin', () => ({ fetchAdmin }));
vi.mock('$lib/server/candidateStatus', () => ({ getCandidateStatus }));
vi.mock('sveltekit-flash-message/server', () => ({ redirect: flashRedirect }));

import { jobIntentDestination, resolveJobIntentRedirect } from './jobIntentRedirect';
import { JOB_COOKIE_NAME } from './jobIntent';

const ID = '3f1c2b9e-8a4d-4c1e-9b7a-0d2e5f6a7b8c';

function makeEvent(opts: { cookie?: string | null; completedOnboarding?: boolean } = {}) {
	const store = new Map<string, string>();
	if (opts.cookie !== null) {
		store.set(JOB_COOKIE_NAME, opts.cookie ?? `${ID}|${new Date().toISOString()}`);
	}
	const cookies = {
		get: vi.fn((n: string) => store.get(n)),
		set: vi.fn(),
		delete: vi.fn((n: string) => void store.delete(n))
	};
	return {
		event: {
			locals: { user: { id: 'u1', completedOnboarding: opts.completedOnboarding ?? true } },
			cookies
		} as any,
		cookies,
		store
	};
}

async function outcome(p: Promise<void>) {
	try {
		await p;
		return null;
	} catch (e: any) {
		return { status: e.status, location: e.location, flash: !!e.flash };
	}
}

beforeEach(() => {
	fetchAdmin.mockReset();
	getCandidateStatus.mockReset().mockResolvedValue('ACTIVE');
	flashRedirect.mockClear();
});

describe('jobIntentDestination', () => {
	it('open permanent → /permanent/{id}', () => {
		expect(
			jobIntentDestination({ requisitionId: 42, permanent: true, firstOpenDate: null, open: true })
		).toEqual({ location: '/permanent/42', unavailable: false });
	});
	it('open temp → calendar focused on first open date + req', () => {
		expect(
			jobIntentDestination({
				requisitionId: 7,
				permanent: false,
				firstOpenDate: '2026-11-03',
				open: true
			})
		).toEqual({ location: '/calendar?date=2026-11-03&req=7', unavailable: false });
	});
	it('open temp without a date → calendar with req only', () => {
		expect(
			jobIntentDestination({ requisitionId: 7, permanent: false, firstOpenDate: null, open: true })
				.location
		).toBe('/calendar?req=7');
	});
	it('closed / missing → unavailable', () => {
		expect(jobIntentDestination(null)).toEqual({ location: '/dashboard', unavailable: true });
		expect(
			jobIntentDestination({ requisitionId: 1, permanent: true, firstOpenDate: null, open: false })
		).toEqual({ location: '/permanent', unavailable: true });
		expect(
			jobIntentDestination({ requisitionId: 1, permanent: false, firstOpenDate: null, open: false })
		).toEqual({ location: '/calendar', unavailable: true });
	});
});

describe('resolveJobIntentRedirect', () => {
	it('does nothing without an intent cookie', async () => {
		const { event } = makeEvent({ cookie: null });
		expect(await outcome(resolveJobIntentRedirect(event))).toBeNull();
		expect(fetchAdmin).not.toHaveBeenCalled();
	});

	it('keeps the cookie and does not redirect while onboarding is incomplete', async () => {
		const { event, cookies } = makeEvent({ completedOnboarding: false });
		expect(await outcome(resolveJobIntentRedirect(event))).toBeNull();
		expect(fetchAdmin).not.toHaveBeenCalled();
		expect(cookies.delete).not.toHaveBeenCalled();
	});

	it('keeps the cookie and does not redirect while not ACTIVE', async () => {
		getCandidateStatus.mockResolvedValue('PENDING');
		const { event, cookies } = makeEvent();
		expect(await outcome(resolveJobIntentRedirect(event))).toBeNull();
		expect(fetchAdmin).not.toHaveBeenCalled();
		expect(cookies.delete).not.toHaveBeenCalled();
	});

	it('redirects to the perm req and clears the cookie', async () => {
		fetchAdmin.mockResolvedValue({
			ok: true,
			status: 200,
			data: { requisitionId: 42, permanent: true, firstOpenDate: null, open: true }
		});
		const { event, cookies } = makeEvent();
		expect(await outcome(resolveJobIntentRedirect(event))).toEqual({
			status: 302,
			location: '/permanent/42',
			flash: false
		});
		expect(fetchAdmin).toHaveBeenCalledWith(`/api/external/resolvePublicJob/${ID}`, {
			token: 'token-u1'
		});
		expect(cookies.delete).toHaveBeenCalledWith(
			JOB_COOKIE_NAME,
			expect.objectContaining({ path: '/', domain: '.example.test' })
		);
	});

	it('404 → clears the cookie and flash-redirects to the dashboard', async () => {
		fetchAdmin.mockResolvedValue({ ok: false, status: 404, reason: 'http', error: 'x' });
		const { event, cookies } = makeEvent();
		expect(await outcome(resolveJobIntentRedirect(event))).toEqual({
			status: 302,
			location: '/dashboard',
			flash: true
		});
		expect(cookies.delete).toHaveBeenCalled();
	});

	it('transient failure → keeps the cookie, no redirect', async () => {
		fetchAdmin.mockResolvedValue({ ok: false, reason: 'timeout', error: 'x' });
		const { event, cookies } = makeEvent();
		expect(await outcome(resolveJobIntentRedirect(event))).toBeNull();
		expect(cookies.delete).not.toHaveBeenCalled();
	});

	it('unexpected 200 shape → treated as unavailable', async () => {
		fetchAdmin.mockResolvedValue({ ok: true, status: 200, data: {} });
		const { event } = makeEvent();
		expect(await outcome(resolveJobIntentRedirect(event))).toMatchObject({
			location: '/dashboard',
			flash: true
		});
	});
});
