/**
 * "Return to job" intent cookie.
 *
 * The public job board on the marketing site identifies each job by an opaque
 * uuid (`publicId`). When an anonymous visitor clicks "apply", the marketing
 * site writes `dtss_job=<publicId>|<ISO8601>` on the shared cookie domain and
 * sends them here with `?job=<publicId>`. Once they are signed in AND eligible
 * to apply, we resolve the publicId through the admin app and send them to
 * that job.
 *
 * ⚠️ KEEP IN SYNC with the marketing site's writer: the two must agree on the
 * cookie name, value format and attributes, because one cookie scoped to
 * PUBLIC_COOKIE_DOMAIN is shared across www / app. Attributes mirror
 * affiliate/refCookie.ts — except LAST touch wins here (the newest job viewed
 * is the one they want back), and the lifetime is 7 days.
 */
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { dev } from '$app/environment';

export const JOB_COOKIE_NAME = 'dtss_job';
export const JOB_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type JobIntent = { publicId: string; capturedAt: Date };

/** Normalise and validate a publicId; null when it isn't a uuid. */
export function normalizePublicId(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const id = raw.trim().toLowerCase();
	return UUID_RE.test(id) ? id : null;
}

/** Parse `<uuid>|<ISO8601>`. Rejects future, expired and malformed values. */
export function parseJobCookie(
	raw: string | null | undefined,
	now: Date = new Date()
): JobIntent | null {
	if (!raw) return null;
	// The marketing site writes via document.cookie; tolerate it URI-encoding `|`.
	let value = raw;
	try {
		value = decodeURIComponent(raw);
	} catch {
		return null;
	}
	const parts = value.split('|');
	if (parts.length !== 2) return null;

	const publicId = normalizePublicId(parts[0]);
	if (!publicId) return null;

	const capturedAt = new Date(parts[1]);
	if (Number.isNaN(capturedAt.getTime())) return null;
	if (capturedAt.getTime() > now.getTime()) return null;
	if ((now.getTime() - capturedAt.getTime()) / 1000 > JOB_COOKIE_MAX_AGE) return null;

	return { publicId, capturedAt };
}

function cookieOptions() {
	return {
		path: '/',
		sameSite: 'lax' as const,
		// Must not be HttpOnly: the static marketing site can only write this via
		// document.cookie, and both writers must agree.
		httpOnly: false,
		secure: !dev,
		...(publicEnv.PUBLIC_COOKIE_DOMAIN ? { domain: publicEnv.PUBLIC_COOKIE_DOMAIN } : {})
	};
}

/**
 * Capture `?job=` into the shared cookie on GET. LAST TOUCH WINS — a valid
 * param always overwrites the existing cookie.
 *
 * Never throws: handleError would turn a throw into a 500 for the whole page.
 */
export function captureJobIntent(event: RequestEvent, now: Date = new Date()): void {
	try {
		if (event.request.method !== 'GET') return;
		const publicId = normalizePublicId(event.url.searchParams.get('job'));
		if (!publicId) return;

		// Re-writing the same job only refreshes the timestamp; skip it so a
		// refresh doesn't keep pushing the expiry out.
		if (parseJobCookie(event.cookies.get(JOB_COOKIE_NAME), now)?.publicId === publicId) return;

		event.cookies.set(JOB_COOKIE_NAME, `${publicId}|${now.toISOString()}`, {
			...cookieOptions(),
			maxAge: JOB_COOKIE_MAX_AGE,
			// SvelteKit URI-encodes by default, which would turn `|` into `%7C` and
			// diverge from the marketing site's writer.
			encode: (v: string) => v
		});
	} catch {
		// Best-effort; must never break a page load.
	}
}

/** The current job intent, or null when absent/invalid/expired. */
export function readJobIntent(cookies: Cookies, now: Date = new Date()): JobIntent | null {
	try {
		return parseJobCookie(cookies.get(JOB_COOKIE_NAME), now);
	} catch {
		return null;
	}
}

/**
 * Clear the cookie. Must use the same domain/path as the writer, or the browser
 * keeps the shared-domain copy and we'd redirect again on the next visit.
 */
export function clearJobIntent(cookies: Cookies): void {
	try {
		cookies.delete(JOB_COOKIE_NAME, cookieOptions());
	} catch {
		// best-effort
	}
}
