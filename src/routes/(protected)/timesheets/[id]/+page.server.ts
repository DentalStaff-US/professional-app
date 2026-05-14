import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, RequestEvent } from './$types';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';
import { superValidate } from 'sveltekit-superforms/server';
import { addExpenseSchema } from '$lib/config/zod-schemas';

export const load: PageServerLoad = async ({ params, locals }) => {
	const timesheetId = params.id;
	if (!timesheetId) {
		throw error(404, 'Timesheet ID is required');
	}

	const { user } = locals;
	if (!user) {
		throw redirect(303, '/sign-in');
	}

	const token = generateToken(user.id);

	const detailsRes = await fetchAdmin<any>(
		`/api/external/timesheets/getTimesheetDetails/${timesheetId}`,
		{ token }
	);

	if (!detailsRes.ok) {
		return {
			timesheet: null,
			requisition: null,
			company: null,
			workday: null,
			recurrenceDay: null,
			workdays: [] as any[],
			loadError: ADMIN_LOAD_ERROR_MESSAGE
		} as any;
	}

	const data = detailsRes.data;
	const workdaysRes = await fetchAdmin<{ workdays?: any[] }>(
		'/api/external/timesheets/getWorkdaysForWeek',
		{
			method: 'POST',
			token,
			body: {
				weekStartDate: data.timesheet.weekBeginDate,
				requisitionId: data.requisition.id
			}
		}
	);

	const expensesRes = await fetchAdmin<{ data?: { expenses?: any[] } }>(
		`/api/external/timesheets/${timesheetId}/expenses`,
		{ token }
	);

	const addExpenseForm = await superValidate(addExpenseSchema);

	return {
		timesheet: data.timesheet,
		requisition: data.requisition,
		company: data.company,
		workday: data.workday,
		recurrenceDay: data.recurrenceDay,
		workdays: workdaysRes.ok ? (workdaysRes.data.workdays ?? []) : [],
		expenses: expensesRes.ok ? (expensesRes.data.data?.expenses ?? []) : [],
		addExpenseForm,
		loadError: workdaysRes.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	} as any;
};

export const actions = {
	submitTimesheet: async (event: RequestEvent) => {
		const timesheetId = event.params.id;
		const { user } = event.locals;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const token = generateToken(user.id);
		const formData = await event.request.formData();
		const entries = JSON.parse(formData.get('entries') as string);
		const totalHours = parseFloat(formData.get('totalHours') as string);

		try {
			// First, fetch the timesheet to get the necessary IDs
			const timesheetResponse = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/getTimesheetDetails/${timesheetId}`,
				{
					method: 'GET',
					headers: { Authorization: `Bearer ${token}` }
				}
			);

			if (!timesheetResponse.ok) {
				throw error(500, 'Failed to fetch timesheet details');
			}

			const timesheetData = await timesheetResponse.json();

			// Convert entries object to array format expected by API
			const entriesArray = Object.entries(entries)
				.filter(([_, value]: [string, any]) => value.hours > 0)
				.map(([date, value]: [string, any]) => ({
					date,
					startTime: value.startTime,
					endTime: value.endTime,
					lunchStartTime: value.lunchStartTime,
					lunchEndTime: value.lunchEndTime,
					hours: value.hours,
					workdayId: value.workdayId || timesheetData.workday?.id || ''
				}));

			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/submitTimesheetForCandidate`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						userId: user.id,
						companyId: timesheetData.company.id,
						weekStartDate: timesheetData.timesheet.weekBeginDate,
						entries: entriesArray,
						totalHours
					})
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				setFlash(
					{ type: 'error', message: errorData.message || 'Failed to submit timesheet' },
					event
				);
				return { success: false, error: errorData.message };
			}

			setFlash({ type: 'success', message: 'Timesheet submitted successfully!' }, event);
			return { success: true };
		} catch (err) {
			logger.error('Failed to submit timesheet', {
				error: err,
				timesheetId,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to submit timesheet' }, event);
			return { success: false, error: 'Failed to submit timesheet' };
		}
	},

	// Save the current entries to hoursRaw without flipping status. Lets the
	// candidate amend a single shift's hours at the end of the day and save
	// progress, rather than waiting until the end of the work week. The
	// DRAFT→PENDING transition is still gated by the `submitTimesheet` action
	// above (which requires the last shift in the week to have ended).
	saveDraftTimesheet: async (event: RequestEvent) => {
		const timesheetId = event.params.id;
		const { user } = event.locals;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const token = generateToken(user.id);
		const formData = await event.request.formData();
		const entries = JSON.parse(formData.get('entries') as string);
		const totalHours = parseFloat(formData.get('totalHours') as string);

		try {
			const timesheetResponse = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/getTimesheetDetails/${timesheetId}`,
				{
					method: 'GET',
					headers: { Authorization: `Bearer ${token}` }
				}
			);

			if (!timesheetResponse.ok) {
				throw error(500, 'Failed to fetch timesheet details');
			}

			const timesheetData = await timesheetResponse.json();

			const entriesArray = Object.entries(entries)
				.filter(([_, value]: [string, any]) => value.hours > 0)
				.map(([date, value]: [string, any]) => ({
					date,
					startTime: value.startTime,
					endTime: value.endTime,
					lunchStartTime: value.lunchStartTime,
					lunchEndTime: value.lunchEndTime,
					hours: value.hours,
					workdayId: value.workdayId || timesheetData.workday?.id || ''
				}));

			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/saveDraftTimesheetForCandidate`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						timesheetId,
						userId: user.id,
						weekStartDate: timesheetData.timesheet.weekBeginDate,
						entries: entriesArray,
						totalHours
					})
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				setFlash(
					{ type: 'error', message: errorData.message || 'Failed to save timesheet' },
					event
				);
				return { success: false, error: errorData.message };
			}

			setFlash({ type: 'success', message: 'Draft saved.' }, event);
			return { success: true };
		} catch (err) {
			logger.error('Failed to save draft timesheet', {
				error: err,
				timesheetId,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to save draft' }, event);
			return { success: false, error: 'Failed to save draft' };
		}
	},

	validateTimesheet: async (event: RequestEvent) => {
		const timesheetId = event.params.id;
		const { user } = event.locals;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const token = generateToken(user.id);

		try {
			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/${timesheetId}/validate`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ status: 'PENDING' })
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				setFlash({ type: 'error', message: 'Failed to validate timesheet' }, event);
				return { success: false, error: errorData.message };
			}

			setFlash({ type: 'success', message: 'Timesheet resubmitted for validation' }, event);
			return { success: true };
		} catch (err) {
			logger.error('Failed to validate timesheet', {
				error: err,
				timesheetId,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to validate timesheet' }, event);
			return { success: false, error: 'Failed to validate timesheet' };
		}
	},
	resubmitTimesheet: async (event: RequestEvent) => {
		const timesheetId = event.params.id;
		const { user } = event.locals;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const token = generateToken(user.id);
		const formData = await event.request.formData();
		const entries = JSON.parse(formData.get('entries') as string);
		const totalHours = parseFloat(formData.get('totalHours') as string);

		try {
			const timesheetResponse = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/getTimesheetDetails/${timesheetId}`,
				{
					method: 'GET',
					headers: { Authorization: `Bearer ${token}` }
				}
			);

			if (!timesheetResponse.ok) {
				throw error(500, 'Failed to fetch timesheet details');
			}

			const timesheetData = await timesheetResponse.json();

			const entriesArray = Object.entries(entries)
				.filter(([_, value]: [string, any]) => value.hours > 0)
				.map(([date, value]: [string, any]) => ({
					date,
					startTime: value.startTime,
					endTime: value.endTime,
					lunchStartTime: value.lunchStartTime,
					lunchEndTime: value.lunchEndTime,
					hours: value.hours,
					workdayId: value.workdayId || timesheetData.workday?.id || ''
				}));

			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/submitTimesheetForCandidate`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						timesheetId: timesheetId,
						userId: user.id,
						companyId: timesheetData.company.id,
						weekStartDate: timesheetData.timesheet.weekBeginDate,
						entries: entriesArray,
						totalHours
					})
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				setFlash(
					{ type: 'error', message: errorData.message || 'Failed to resubmit timesheet' },
					event
				);
				return { success: false, error: errorData.message };
			}

			setFlash(
				{ type: 'success', message: 'Timesheet corrected and resubmitted successfully!' },
				event
			);
			return { success: true };
		} catch (err) {
			logger.error('Failed to resubmit timesheet', {
				error: err,
				timesheetId,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to resubmit timesheet' }, event);
			return { success: false, error: 'Failed to resubmit timesheet' };
		}
	},

	cancelTimesheet: async (event: RequestEvent) => {
		const timesheetId = event.params.id;
		const { user } = event.locals;

		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const token = generateToken(user.id);

		try {
			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/timesheets/${timesheetId}/cancel`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ status: 'VOID' })
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				setFlash({ type: 'error', message: 'Failed to cancel timesheet' }, event);
				return { success: false, error: errorData.message };
			}

			setFlash({ type: 'success', message: 'Timesheet cancelled successfully' }, event);
		} catch (err) {
			logger.error('Failed to cancel timesheet', {
				error: err,
				timesheetId,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to cancel timesheet' }, event);
			return { success: false, error: 'Failed to cancel timesheet' };
		}

		redirect(302, '/timesheets');
	},

	addExpense: async (event: RequestEvent) => {
		const timesheetId = event.params.id;
		const { user } = event.locals;
		if (!user) throw error(401, 'Unauthorized');

		const form = await superValidate(event, addExpenseSchema);
		if (!form.valid) {
			setFlash({ type: 'error', message: 'Please correct the expense form.' }, event);
			return fail(400, { form });
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ success: boolean; message?: string }>(
			`/api/external/timesheets/${timesheetId}/expenses`,
			{
				method: 'POST',
				token,
				body: {
					description: form.data.description,
					amountCents: Math.round(form.data.amountDollars * 100)
				}
			}
		);

		if (!res.ok) {
			setFlash({ type: 'error', message: 'Failed to add expense' }, event);
			return fail(500, { form });
		}
		setFlash({ type: 'success', message: 'Expense added' }, event);
		return { form };
	},

	updateExpense: async (event: RequestEvent) => {
		const { user } = event.locals;
		if (!user) throw error(401, 'Unauthorized');

		const formData = await event.request.formData();
		const expenseId = String(formData.get('expenseId') ?? '');
		const description = String(formData.get('description') ?? '').trim();
		const amountDollarsRaw = String(formData.get('amountDollars') ?? '').trim();
		const amountDollars = parseFloat(amountDollarsRaw);

		if (!expenseId) return { success: false, error: 'Missing expense id' };

		const body: Record<string, unknown> = {};
		if (description) body.description = description;
		if (isFinite(amountDollars) && amountDollars > 0) {
			body.amountCents = Math.round(amountDollars * 100);
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin(`/api/external/expenses/${expenseId}`, {
			method: 'PATCH',
			token,
			body
		});

		if (!res.ok) {
			setFlash({ type: 'error', message: 'Failed to update expense' }, event);
			return { success: false };
		}
		setFlash({ type: 'success', message: 'Expense updated' }, event);
		return { success: true };
	},

	deleteExpense: async (event: RequestEvent) => {
		const { user } = event.locals;
		if (!user) throw error(401, 'Unauthorized');

		const formData = await event.request.formData();
		const expenseId = String(formData.get('expenseId') ?? '');
		if (!expenseId) return { success: false, error: 'Missing expense id' };

		const token = generateToken(user.id);
		const res = await fetchAdmin(`/api/external/expenses/${expenseId}`, {
			method: 'DELETE',
			token
		});

		if (!res.ok) {
			setFlash({ type: 'error', message: 'Failed to delete expense' }, event);
			return { success: false };
		}
		setFlash({ type: 'success', message: 'Expense deleted' }, event);
		return { success: true };
	}
};
