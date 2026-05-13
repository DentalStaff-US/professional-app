import type { PageServerLoad } from './$types';
import { generateToken } from '$lib/server/utils';
import { redirect } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;
	const userId = user?.id;

	if (!userId) {
		redirect(301, '/auth/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}

	const token = generateToken(userId);
	const res = await fetchAdmin<any>('/api/external/inbox/getConversationsForUser', { token });

	return {
		user,
		conversations: res.ok ? res.data : null,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};
