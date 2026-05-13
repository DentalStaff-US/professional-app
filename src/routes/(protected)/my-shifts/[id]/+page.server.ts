import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, RequestEvent } from './$types';
import { generateToken } from '$lib/server/utils';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

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
	cancelWorkdayShift: async (event) => {
		if (!event.locals.user) {
			throw redirect(301, '/auth/sign-in');
		}
		const formData = await event.request.formData();
		const workdayId = formData.get('workdayId');
		const token = generateToken(event.locals.user.id);

		try {
			const cancelReq = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/cancelWorkdayForCandidate/${workdayId}`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
				}
			);

			if (!cancelReq.ok) {
				throw new Error('Failed to cancel workday shift');
			}
			const cancelResponse = await cancelReq.json();
			if (cancelResponse.success) {
				setFlash(
					{
						type: 'success',
						message: 'Workday shift cancelled successfully.'
					},
					event
				);
			}
		} catch (error) {
			logger.error('Failed to cancel workday shift', {
				error,
				workdayId,
				distinctId: event.locals.user.id
			});
			setFlash(
				{
					type: 'error',
					message: 'Error cancelling workday shift. Please try again.'
				},
				event
			);
			return {
				success: false,
				message: 'Error cancelling workday shift. Please try again.'
			};
		}
		redirect(301, '/my-shifts');
	}
};
