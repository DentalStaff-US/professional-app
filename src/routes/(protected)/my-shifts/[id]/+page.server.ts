import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, RequestEvent } from './$types';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { cancelShift } from '$features/shifts/server/cancel';
import { messagePractice } from '$features/inbox/server/messagePractice';

export const load: PageServerLoad = async (event: RequestEvent) => {
	event.setHeaders({
		'cache-control': 'max-age=60'
	});
	const user = event.locals.user;

	if (!user) {
		redirect(301, '/auth/sign-in');
	}

	const token = generateToken(user.id);
	const { id } = event.params;
	const res = await fetchAdmin<{ data: unknown }>(
		`/api/external/getWorkdayDetailsForCandidate/${id}`,
		{ token }
	);

	return {
		user,
		workday: (res.ok ? (res.data.data ?? null) : null) as any,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	messagePractice: (event: RequestEvent) => messagePractice(event, { workdayId: event.params.id! }),
	cancelWorkdayShift: async (event) => {
		if (!event.locals.user) {
			redirect(303, '/auth/sign-in');
		}
		if (await cancelShift(event)) {
			redirect(303, '/my-shifts?tab=upcoming');
		}
		return { success: false };
	}
};
