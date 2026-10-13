import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms/server';
import { setFlash } from 'sveltekit-flash-message/server';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { candidateAvailabilitySchema } from '$lib/config/zod-schemas';
import { todayInBusinessTz } from '$lib/components/availability/availability';
import type { BookedDay } from '$lib/components/availability/availability';

/**
 * How far ahead the editor loads on first paint. NOT a limit on how far ahead a
 * professional may block: the calendar pages forward freely, and each save declares
 * the window it is authoritative for. This is only the initial fetch range.
 */
const INITIAL_MONTHS = 12;

type AvailabilityResponse = {
	availableDays: number[] | null;
	availableDaysDefaulted: boolean;
	availableDaysUpdatedAt: string | null;
	availableDaysSource: 'CANDIDATE' | 'ADMIN' | null;
	blackouts: Array<{ date: string; note: string | null; source: 'CANDIDATE' | 'ADMIN' }>;
	bookedDates: Array<{
		date: string;
		requisitionId: number;
		recurrenceDayId: string | null;
		workdayId: string;
	}>;
	window: { from: string; to: string };
};

function addMonthsToISO(date: string, months: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const total = (y * 12 + (m - 1)) + months;
	const year = Math.floor(total / 12);
	const month = (total % 12) + 1;
	// Clamp the day so e.g. Jan 31 + 1 month lands on Feb 28/29 rather than rolling.
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const day = Math.min(d, lastDay);
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;
	if (!user) redirect(302, '/sign-in');

	const token = generateToken(user.id);
	const from = todayInBusinessTz();
	const to = addMonthsToISO(from, INITIAL_MONTHS);

	const res = await fetchAdmin<AvailabilityResponse>(
		`/api/external/getCandidateAvailability?from=${from}&to=${to}`,
		{ token }
	);

	const availability = res.ok ? res.data : null;

	// Seed the form from the CURRENT values, NOT superValidate(event, schema).
	//
	// The dominant idiom in this repo seeds from `event`, which here would render an
	// empty form whose first save WIPES the professional's availability. The correct
	// precedent is settings/edit-profile.
	const form = await superValidate(
		{
			availableDays: availability?.availableDays ?? null,
			blockedDates: availability?.blackouts.map((b) => b.date) ?? [],
			replaceFrom: from,
			replaceTo: to
		},
		candidateAvailabilitySchema
	);

	const bookedDates: BookedDay[] =
		availability?.bookedDates.map((b) => ({
			date: b.date,
			label: `Working — Req #${b.requisitionId}`,
			workdayId: b.workdayId
		})) ?? [];

	return {
		form,
		today: from,
		window: { from, to },
		bookedDates,
		// Gates the editor. Rendering it from empty state after a failed load, and
		// then saving, would delete every blackout the professional has set.
		availabilityLoaded: res.ok,
		setByAdminOn:
			availability?.availableDaysSource === 'ADMIN' && availability.availableDaysUpdatedAt
				? availability.availableDaysUpdatedAt
				: null,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	saveAvailability: async (event: RequestEvent) => {
		const { user } = event.locals;
		if (!user) redirect(302, '/sign-in');

		const form = await superValidate(event, candidateAvailabilitySchema);
		if (!form.valid) return fail(400, { form });

		const res = await fetchAdmin<{
			blackouts: { added: string[]; removed: string[]; ignoredPast: string[] };
		}>('/api/external/updateCandidateAvailability', {
			method: 'POST',
			token: generateToken(user.id),
			body: {
				availableDays: form.data.availableDays,
				blackouts: {
					from: form.data.replaceFrom,
					to: form.data.replaceTo,
					dates: form.data.blockedDates
				}
			}
		});

		if (!res.ok) {
			setFlash({ type: 'error', message: res.error || 'Could not save your availability.' }, event);
			return fail(res.status ?? 500, { form });
		}

		setFlash({ type: 'success', message: 'Availability saved.' }, event);
		return message(form, 'saved');
	}
};
