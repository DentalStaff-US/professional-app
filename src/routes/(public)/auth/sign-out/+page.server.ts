import { redirect } from 'sveltekit-flash-message/server';
import { auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// ...
};
export const actions = {
	default: async (event) => {
		if (!event.locals.user) redirect(302, '/auth/sign-in');

		// Revokes the session and clears the cookie (via the sveltekitCookies plugin).
		await auth.api.signOut({ headers: event.request.headers });

		const message = { type: 'success', message: 'Logged out' } as const;
		redirect(302, '/auth/sign-in', message, event.cookies);
	}
};
