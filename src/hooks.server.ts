import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import type { HandleServerError } from '@sveltejs/kit';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { logger } from '$lib/server/logger';
import type { AppUser } from '$lib/server/auth';

export const handleError: HandleServerError = async ({ error, event }) => {
	const errorId = crypto.randomUUID();
	logger.error('uncaught server error', {
		error,
		errorId,
		path: event.url.pathname,
		method: event.request.method,
		distinctId: event.locals.user?.id
	});
	return {
		message: 'An unexpected error occurred.',
		errorId
	};
};

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Reverse proxy for PostHog — route /ingest requests to PostHog servers.
	// Mirrors the admin app so client-side posthog-js can post to a same-origin
	// path and avoid ad-blockers.
	if (pathname.startsWith('/ingest')) {
		const useAssetHost =
			pathname.startsWith('/ingest/static/') || pathname.startsWith('/ingest/array/');
		const hostname = useAssetHost ? 'us-assets.i.posthog.com' : 'us.i.posthog.com';

		const url = new URL(event.request.url);
		url.protocol = 'https:';
		url.hostname = hostname;
		url.port = '443';
		url.pathname = pathname.replace(/^\/ingest/, '');

		const headers = new Headers(event.request.headers);
		headers.set('host', hostname);
		headers.set('accept-encoding', '');

		const clientIp = event.request.headers.get('x-forwarded-for') || event.getClientAddress();
		if (clientIp) {
			headers.set('x-forwarded-for', clientIp);
		}

		const response = await fetch(url.toString(), {
			method: event.request.method,
			headers,
			body: event.request.body,
			// @ts-expect-error - duplex is required for streaming request bodies
			duplex: 'half'
		});

		return response;
	}

	const startTimer = Date.now();
	event.locals.startTimer = startTimer;

	if (building) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	// Validate the Better Auth session and normalise into the Lucia-compatible
	// shape (userId/verified/avatarUrl) the rest of the app expects.
	const authSession = await auth.api.getSession({ headers: event.request.headers });
	const baUser = authSession?.user ?? null;
	const user: AppUser | null = baUser
		? {
				...baUser,
				role: baUser.role ?? 'CANDIDATE',
				onboardingStep: baUser.onboardingStep ?? 1,
				completedOnboarding: baUser.completedOnboarding ?? false,
				timezone: baUser.timezone ?? 'America/New_York',
				userId: baUser.id,
				verified: baUser.emailVerified,
				avatarUrl: baUser.image ?? null
			}
		: null;

	event.locals.user = user;
	event.locals.session = authSession?.session ?? null;

	// Let Better Auth own its endpoints (/api/auth/*).
	if (event.url.pathname.startsWith('/api/auth')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	// Symmetric to the admin app's CANDIDATE-redirect guard: the candidate app
	// must only host candidate sessions. Sign out any non-candidate and bounce
	// them to the admin app, else candidate-only API lookups 500.
	if (user && user.role !== 'CANDIDATE') {
		try {
			await auth.api.signOut({ headers: event.request.headers });
		} catch {
			// best-effort
		}
		event.locals.user = null;
		event.locals.session = null;
		redirect(302, PUBLIC_CLIENT_APP_DOMAIN);
	}

	if (event.route.id?.startsWith('/(protected)')) {
		if (!user) redirect(302, '/auth/sign-in');
		if (!user.verified) redirect(302, '/auth/verify/email');
	}
	if (event.route.id?.startsWith('/(admin)')) {
		if (user?.role !== 'ADMIN') redirect(302, '/auth/sign-in');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
