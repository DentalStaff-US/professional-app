/**
 * Referral attribution cookie — candidate-app copy.
 *
 * ⚠️ KEEP IN SYNC with dental-staff-app/src/lib/server/affiliate/cookie.ts.
 * The two apps must agree byte-for-byte on the cookie name and value format,
 * because one cookie scoped to `.dtstaffingsolutions.com` is shared across
 * www / internal / app / partners.
 *
 * This app owns NO affiliate tables — all affiliate logic and data live in
 * dental-staff-app and are reached over /api/external/affiliate/*. This module
 * therefore only reads and writes the cookie; it never resolves a code.
 *
 * Click logging is deliberately NOT done here: the canonical referral link
 * points at the marketing site, and losing a click row must never cost the
 * attribution itself.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { dev } from '$app/environment';

export const REF_COOKIE_NAME = 'dtss_ref';
export const REF_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days

/** Same shape as the admin app: `CODE|ISO8601`. */
export function parseRefCookie(
	raw: string | null | undefined,
	now: Date = new Date()
): { code: string; firstTouchAt: Date } | null {
	if (!raw) return null;
	const parts = raw.split('|');
	if (parts.length !== 2) return null;

	const code = parts[0].trim().toUpperCase();
	if (!/^[A-Z0-9-]{4,32}$/.test(code)) return null;

	const firstTouchAt = new Date(parts[1]);
	if (Number.isNaN(firstTouchAt.getTime())) return null;
	if (firstTouchAt.getTime() > now.getTime()) return null;
	if ((now.getTime() - firstTouchAt.getTime()) / 1000 > REF_COOKIE_MAX_AGE) return null;

	return { code, firstTouchAt };
}

/**
 * Capture `?ref=` into the shared cookie. FIRST TOUCH WINS — an existing valid
 * cookie is never overwritten.
 *
 * Never throws: handleError would turn a throw into a 500 for the whole page.
 */
export function captureReferralCookie(event: RequestEvent, now: Date = new Date()): void {
	try {
		const raw = event.url.searchParams.get('ref');
		if (!raw) return;

		const code = raw.trim().toUpperCase();
		if (!/^[A-Z0-9-]{4,32}$/.test(code)) return;

		if (parseRefCookie(event.cookies.get(REF_COOKIE_NAME), now)) return; // first touch wins

		event.cookies.set(REF_COOKIE_NAME, `${code}|${now.toISOString()}`, {
			path: '/',
			maxAge: REF_COOKIE_MAX_AGE,
			sameSite: 'lax',
			// Must not be HttpOnly: the static Astro marketing site can only write
			// this via document.cookie, and both writers must agree.
			httpOnly: false,
			secure: !dev,
			...(publicEnv.PUBLIC_COOKIE_DOMAIN ? { domain: publicEnv.PUBLIC_COOKIE_DOMAIN } : {})
		});
	} catch {
		// Attribution is best-effort and must never break a page load.
	}
}
