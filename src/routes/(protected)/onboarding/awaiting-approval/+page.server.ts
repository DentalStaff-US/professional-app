import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { resolveJobIntentRedirect } from '$lib/server/jobIntentRedirect';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/sign-in');
	}

	const token = generateToken(user.id);
	const res = await fetchAdmin<{ approved?: boolean }>('/api/external/getCandidateProfile', {
		token
	});

	if (res.ok && user.completedOnboarding && res.data.approved) {
		// Skip the dashboard hop when they came from a public job. Returns (no
		// redirect) when there is no intent or they aren't ACTIVE yet.
		await resolveJobIntentRedirect(event);
		redirect(302, '/dashboard');
	}

	return {
		user,
		profile: res.ok ? res.data : null,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};
