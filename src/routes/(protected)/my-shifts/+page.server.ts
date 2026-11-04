import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, RequestEvent } from './$types';
import { generateToken } from '$lib/server/utils';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE, adminForwardHeaders } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';
import { superValidate } from 'sveltekit-superforms/server';
import { recurrenceDayClaimSchema } from '$lib/config/zod-schemas.js';
import { claimShift } from '$features/shifts/server/claim';

export const load: PageServerLoad = async (event: RequestEvent) => {
	const tab = event.url.searchParams.get('tab');
	const showUnavailable = event.url.searchParams.get('showUnavailable') === '1';

	// Not cached while showing the unavailable set: the two variants are different
	// responses on the same path, and a 60s cache would serve one for the other.
	if (!showUnavailable) {
		event.setHeaders({
			'cache-control': 'max-age=60'
		});
	}
	const user = event.locals.user;

	if (!user) {
		redirect(301, '/auth/sign-in');
	}

	const token = generateToken(user.id);
	const [workdaysRes, openRes] = await Promise.all([
		fetchAdmin<{ data: any[] }>('/api/external/getWorkdaysForCandidate', { token }),
		// Only the Available tab needs this, and it's the slowest call on the page.
		tab === 'available'
			? fetchAdmin<{
					recurrenceDays: any[];
					certLocked?: any[];
					availability?: { hiddenByAvailability: number };
					workPreference?: any;
				}>(
					`/api/external/getUpcomingTempRequisitionsForCandidate${showUnavailable ? '?includeUnavailable=true' : ''}`,
					{ token }
				)
			: null
	]);

	return {
		user,
		tab,
		showUnavailable,
		claimForm: await superValidate(event, recurrenceDayClaimSchema),
		workdays: workdaysRes.ok ? (workdaysRes.data.data ?? []) : [],
		openShifts: openRes?.ok ? (openRes.data.recurrenceDays ?? []) : [],
		certLocked: openRes?.ok ? (openRes.data.certLocked ?? []) : [],
		hiddenByAvailability: openRes?.ok ? (openRes.data.availability?.hiddenByAvailability ?? 0) : 0,
		workPreference: openRes?.ok ? openRes.data.workPreference : undefined,
		loadError: workdaysRes.ok && (openRes?.ok ?? true) ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	claimWorkdayShift: claimShift,
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
					headers: {
						...adminForwardHeaders(),
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (!cancelReq.ok) {
				throw new Error('Failed to cancel workday shift');
			}
			const cancelResponse = await cancelReq.json();
			if (!cancelResponse.success) {
				throw new Error('Cancellation was refused');
			}
			setFlash({ type: 'success', message: 'Your shift was cancelled.' }, event);
			return {
				success: true,
				message: 'Your shift was cancelled.'
			};
		} catch (error) {
			logger.error('Failed to cancel workday shift', {
				error,
				workdayId,
				distinctId: event.locals.user.id
			});
			setFlash(
				{
					type: 'error',
					message: "We couldn't cancel your shift. Please try again."
				},
				event
			);
			return {
				success: false,
				message: "We couldn't cancel your shift. Please try again."
			};
		}
	}
};
