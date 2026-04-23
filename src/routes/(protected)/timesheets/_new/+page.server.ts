import type { PageServerLoad, RequestEvent } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { generateToken } from '$lib/server/utils';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { setFlash } from 'sveltekit-flash-message/server';
import { zJsonString } from '$lib/config/zod-schemas';

const newTimesheetSchema = z.object({
	companyId: z.string().min(1, 'Company ID is required'),
	weekStartDate: z.string().min(1, 'Week start date is required'),
	entries: zJsonString,
	totalHours: z.number().min(1, 'Total hours is required')
});

export const load: PageServerLoad = async (event) => {
	event.setHeaders({
		'cache-control': 'max-age=60'
	});

	const { user } = event.locals;

	if (!user) {
		return redirect(303, '/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}

	const userId = user.id;

	const token = generateToken(userId);
	const form = await superValidate(event, newTimesheetSchema);
	try {
		const response = await fetch(
			`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/getCompaniesForCandidate`,
			{
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` }
			}
		);
		const {
			data: { companies }
		} = await response.json();

		const profileReq = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/getCandidateProfile`, {
			method: 'GET',
			headers: { Authorization: `Bearer ${token}` }
		});

		if (!profileReq.ok) {
			if (profileReq.status === 401) {
				throw error(401, 'Authentication failed');
			}
			throw error(profileReq.status, 'Failed to fetch profile');
		}

		const profile = await profileReq.json();

		const workdayReq = await fetch(
			`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/getWorkdaysForCandidate`,
			{
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` }
			}
		);
		const {
			data: { workdays }
		} = await workdayReq.json();

		const timesheetsReq = await fetch(
			`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/getTimesheetsForUser`,
			{
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` }
			}
		);

		const timesheets = await timesheetsReq.json();

		return {
			user,
			form,
			companies,
			workdays,
			timesheets: timesheets.data,
			profile
		};
	} catch (error) {
		console.error('Error in timesheets/new load file:', error);
		return {
			user,
			form,
			workdays: [],
			timesheets: [],
			profile: null,
			companies: []
		};
	}
};

export const actions = {
	submitTimesheet: async (event: RequestEvent) => {
		const user = event.locals.user;
		if (!user) {
			throw redirect(302, '/auth/sign-in');
		}
		const token = generateToken(user.id);
		const form = await superValidate(event, newTimesheetSchema);
		console.log(JSON.stringify(form, null, 2));

		if (!form.valid) {
			return fail(400, { form });
		}
		const { companyId, weekStartDate, entries, totalHours } = form.data;
		const testDate = new Date(weekStartDate);

		console.log('date data', {
			testDate,
			weekStartDate
		});

		const timesheetData = {
			companyId,
			weekStartDate,
			entries: entries,
			userId: user.id,
			totalHours
		};

		const response = await fetch(
			`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/submitTimesheetForCandidate`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(timesheetData)
			}
		);

		if (!response.ok) {
			const errorData = await response.json();
			setError(form, errorData.message);
			return fail(response.status, { form, error: errorData.message });
		}
		const responseData = await response.json();

		setFlash({ type: 'success', message: 'Timesheet submitted' }, event);
		return redirect(300, `/timesheets/${responseData.data.id}`);
	}
};
