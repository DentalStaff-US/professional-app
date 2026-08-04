import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { generateToken } from '$lib/server/utils';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		redirect(302, '/auth/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}

	const { id } = params;
	// Practice profiles are only served to candidates who work with the practice
	// (live shift or approved application) — the endpoint 404s otherwise, so this
	// call is authenticated and a 404 is passed straight through to the user.
	const token = generateToken(user.id);
	const res = await fetchAdmin<{ company: any; requisitions: any[] }>(
		`/api/external/getCompanyDetails/${id}`,
		{ token }
	);

	if (!res.ok && res.status === 404) {
		error(404, 'This practice profile is available once you have a shift with them.');
	}

	return {
		company: res.ok ? (res.data.company ?? null) : null,
		requisitions: res.ok ? (res.data.requisitions ?? []) : [],
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};
