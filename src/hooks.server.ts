import { lucia } from '$lib/server/lucia';
import { redirect, type Handle } from '@sveltejs/kit';
import type { HandleServerError } from '@sveltejs/kit';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { logger } from '$lib/server/logger';

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

	const sessionId = event.cookies.get(lucia.sessionCookieName);
	const { session, user } = sessionId
		? await lucia.validateSession(sessionId)
		: { session: null, user: null };

	// Symmetric to the admin app's CANDIDATE-redirect guard. The candidate
	// app must only host candidate sessions; if a CLIENT, CLIENT_STAFF, or
	// SUPERADMIN somehow ends up with a session here, kill it on the way
	// out and bounce them to the admin app. Without this, every protected
	// page 500s when the candidate-only API endpoints look up a profile
	// that doesn't exist for non-candidate users.
	if (user && session && user.role !== 'CANDIDATE') {
		await lucia.invalidateSession(session.id);
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
		redirect(302, PUBLIC_CLIENT_APP_DOMAIN);
	}

	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	event.locals.user = user;
	event.locals.session = session;

	if (event.route.id?.startsWith('/(protected)')) {
		if (!user) redirect(302, '/auth/sign-in');
		if (!user.verified) redirect(302, '/auth/verify/email');
	}
	if (event.route.id?.startsWith('/(admin)')) {
		if (user?.role !== 'ADMIN') redirect(302, '/auth/sign-in');
	}

	const response = await resolve(event);
	return response;
};
