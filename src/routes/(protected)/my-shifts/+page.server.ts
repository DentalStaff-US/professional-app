import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, RequestEvent } from './$types';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { superValidate } from 'sveltekit-superforms/server';
import { recurrenceDayClaimSchema } from '$lib/config/zod-schemas.js';
import { shiftsTab } from '$features/shifts/split';
import { cancelShift } from '$features/shifts/server/cancel';
import { claimShift } from '$features/shifts/server/claim';

export const load: PageServerLoad = async (event: RequestEvent) => {
	const tab = shiftsTab(event.url.searchParams.get('tab'));
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
			redirect(303, '/auth/sign-in');
		}
		const success = await cancelShift(event);
		return { success };
	}
};
