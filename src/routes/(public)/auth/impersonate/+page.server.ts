import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

// Receiving end of cross-app impersonation. The admin app generates a one-time
// token bound to an impersonation session for this candidate, then opens this
// route (new tab) with ?token=. verifyOneTimeToken establishes the candidate-
// domain session cookie (setSessionCookie), so we land authenticated as the
// candidate (with session.impersonatedBy set to the admin's id).
export const load: PageServerLoad = async (event) => {
	const token = event.url.searchParams.get('token');
	if (!token) {
		redirect(302, '/auth/sign-in');
	}

	try {
		await auth.api.verifyOneTimeToken({
			headers: event.request.headers,
			body: { token }
		});
	} catch {
		redirect(302, '/auth/sign-in');
	}

	redirect(302, '/dashboard');
};
