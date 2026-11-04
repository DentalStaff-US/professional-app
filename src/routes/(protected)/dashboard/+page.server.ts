import { recurrenceDayClaimSchema } from '$lib/config/zod-schemas.js';
import { generateToken } from '$lib/server/utils.js';
import { redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { claimShift } from '$features/shifts/server/claim';
import { resolveJobIntentRedirect } from '$lib/server/jobIntentRedirect';

export const load = async (event) => {
	// Return to the public job they clicked "apply" on, if any and if eligible.
	// Runs BEFORE setHeaders so a redirect never carries the 60s cache header —
	// a cached /dashboard → /dashboard 302 would loop.
	await resolveJobIntentRedirect(event);

	// A URL param rather than component state, so "show me the shifts my
	// availability is hiding" survives a refresh and can be shared with support.
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
		redirect(302, '/auth/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}
	const token = generateToken(user.id);

	const [workdaysRes, timesheetsRes, requisitionsRes] = await Promise.all([
		fetchAdmin<{ data: any[] }>('/api/external/getUpcomingWorkdaysForCandidate', { token }),
		fetchAdmin<{ data: any[] }>('/api/external/timesheets/getPendingTimesheetsForUser', {
			token
		}),
		fetchAdmin<{
			recurrenceDays: any[];
			certLocked?: any[];
			availability?: {
				availableDays: number[] | null;
				isCustomised: boolean;
				hiddenByAvailability: number;
			};
			workPreference?: {
				preference: 'TEMP' | 'PERMANENT' | 'BOTH' | null;
				excluded: { preference: string; message: string } | null;
			};
		}>(
			`/api/external/getUpcomingTempRequisitionsForCandidate${showUnavailable ? '?includeUnavailable=true' : ''}`,
			{ token }
		)
	]);

	return {
		user,
		// See calendar/+page.server.ts: the page used to declare `export let
		// applyForm`, which a +page.svelte never receives, so every fail() from
		// claimWorkdayShift was silently discarded.
		claimForm: await superValidate(event, recurrenceDayClaimSchema),
		workdays: workdaysRes.ok ? (workdaysRes.data.data ?? []) : [],
		timesheets: timesheetsRes.ok ? (timesheetsRes.data.data ?? []) : [],
		requisitions: requisitionsRes.ok ? (requisitionsRes.data.recurrenceDays ?? []) : [],
		// See permanent/+page.server.ts — drives the "shifts are hidden" banner.
		certLocked: requisitionsRes.ok ? (requisitionsRes.data.certLocked ?? []) : [],
		// Same purpose as certLocked, for the professional's own availability:
		// explain the absence rather than let shifts quietly disappear.
		hiddenByAvailability: requisitionsRes.ok
			? (requisitionsRes.data.availability?.hiddenByAvailability ?? 0)
			: 0,
		showUnavailable,
		// See permanent/+page.server.ts.
		workPreference: requisitionsRes.ok ? requisitionsRes.data.workPreference : undefined,
		loadError:
			workdaysRes.ok && timesheetsRes.ok && requisitionsRes.ok
				? undefined
				: ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	claimWorkdayShift: claimShift
};
