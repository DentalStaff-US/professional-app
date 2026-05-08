import { lucia } from '$lib/server/lucia';
import { redirect, type Handle } from '@sveltejs/kit';
import type { HandleServerError } from '@sveltejs/kit';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';

import log from '$lib/server/log';

export const handleError: HandleServerError = async ({ error, event }) => {
	const errorId = crypto.randomUUID();

	event.locals.error = error?.toString() || '';
	if (error instanceof Error) {
		event.locals.errorStackTrace = error.stack || '';
	} else {
		event.locals.errorStackTrace = '';
	}
	event.locals.errorId = errorId;
	log(500, event);

	return {
		message: 'An unexpected error occurred.',
		errorId
	};
};
export const handle: Handle = async ({ event, resolve }) => {
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
	log(response.status, event);
	return response;
};
