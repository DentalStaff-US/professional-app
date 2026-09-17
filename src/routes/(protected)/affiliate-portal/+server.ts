import { redirect, type RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { PARTNER_PORTAL_URL } from '$lib/config/portal';

/**
 * Hand the signed-in professional off to the affiliate portal, already
 * authenticated, using Better Auth's oneTimeToken plugin.
 *
 * Mirrors the same route in dental-staff-app. If minting fails we still send
 * them to the portal — they just sign in normally there.
 */
export const GET: RequestHandler = async (event) => {
	const base = PARTNER_PORTAL_URL.replace(/\/$/, '');

	const requested = event.url.searchParams.get('to');
	const to = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/';

	// Only the token minting is wrapped — `redirect()` works by throwing, so
	// calling it inside the try would have it swallowed by our own catch.
	let token: string | null = null;
	try {
		const result = await auth.api.generateOneTimeToken({ headers: event.request.headers });
		token = result?.token ?? null;
	} catch (err) {
		console.error('[candidate] affiliate portal SSO handoff failed', err);
	}

	if (!token) redirect(302, base);

	redirect(
		302,
		`${base}/auth/sso?token=${encodeURIComponent(token)}&redirectTo=${encodeURIComponent(to)}`
	);
};
