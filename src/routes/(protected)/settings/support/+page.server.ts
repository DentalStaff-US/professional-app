import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export type CandidateSupportTicket = {
	supportTicket: {
		id: string;
		title: string;
		status: 'NEW' | 'PENDING' | 'CLOSED' | null;
		createdAt: string;
		updatedAt: string;
	};
	reportedBy: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		avatarUrl: string | null;
		role: string;
	};
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;
	if (!user) redirect(302, '/sign-in');

	const token = generateToken(user.id);
	const res = await fetchAdmin<CandidateSupportTicket[]>('/api/external/support/tickets', {
		token
	});

	return {
		user,
		tickets: res.ok ? res.data : [],
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

const newTicketSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	expectedResults: z.string().min(1, 'Expected results are required'),
	actualResults: z.string().min(1, 'Actual results are required'),
	stepsToReproduce: z.string().optional().default('')
});

export const actions: Actions = {
	default: async (event) => {
		const { user } = event.locals;
		if (!user) redirect(302, '/sign-in');

		const data = await event.request.formData();
		const parsed = newTicketSchema.safeParse({
			title: data.get('title'),
			expectedResults: data.get('expectedResults'),
			actualResults: data.get('actualResults'),
			stepsToReproduce: data.get('stepsToReproduce') || ''
		});

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.errors[0]?.message ?? 'Invalid form data'
			});
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ id: string }>('/api/external/support/tickets', {
			method: 'POST',
			token,
			body: parsed.data
		});

		if (!res.ok) {
			logger.error('Failed to create support ticket', {
				reason: res.reason,
				status: res.status,
				distinctId: user.id
			});
			return fail(500, { error: 'Could not submit ticket. Please try again.' });
		}

		redirect(303, `/settings/support/${res.data.id}`);
	}
};
