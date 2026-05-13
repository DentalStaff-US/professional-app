import type { PageServerLoad, Actions } from './$types';
import { fail, redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

type Reporter = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatarUrl: string | null;
	role: string;
};

export type TicketDetailsResponse = {
	details: {
		ticket: {
			id: string;
			title: string;
			status: 'NEW' | 'PENDING' | 'CLOSED' | null;
			createdAt: string;
			updatedAt: string;
			closedById: string | null;
			expectedResult: string | null;
			actualResults: string | null;
			stepsToReproduce: string | null;
			reportedById: string;
		};
		reportedBy: Reporter | null;
		closedBy: Reporter | null;
	};
	comments: Array<{
		comment: {
			id: string;
			body: string;
			createdAt: string;
			updatedAt: string;
			supportTicketId: string;
			fromId: string;
		};
		user: Reporter | null;
	}>;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = locals;
	if (!user) redirect(302, '/sign-in');

	const token = generateToken(user.id);
	const res = await fetchAdmin<TicketDetailsResponse>(
		`/api/external/support/tickets/${params.id}`,
		{ token }
	);

	if (!res.ok) {
		if (res.status === 404) throw error(404, 'Ticket not found');
		if (res.status === 403) throw error(403, 'Forbidden');
		return {
			user,
			ticket: null,
			loadError: ADMIN_LOAD_ERROR_MESSAGE
		};
	}

	return { user, ticket: res.data, loadError: undefined };
};

const commentSchema = z.object({ body: z.string().min(1, 'Comment cannot be empty') });

export const actions: Actions = {
	addComment: async (event) => {
		const { user } = event.locals;
		if (!user) redirect(302, '/sign-in');

		const data = await event.request.formData();
		const parsed = commentSchema.safeParse({ body: data.get('body') });
		if (!parsed.success) {
			return fail(400, { error: parsed.error.errors[0]?.message ?? 'Invalid comment' });
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ id: string }>(
			`/api/external/support/tickets/${event.params.id}/comments`,
			{ method: 'POST', token, body: parsed.data }
		);

		if (!res.ok) {
			logger.error('Failed to post support ticket comment', {
				reason: res.reason,
				status: res.status,
				ticketId: event.params.id,
				distinctId: user.id
			});
			return fail(500, { error: 'Could not post comment. Please try again.' });
		}

		return { success: true };
	},
	closeTicket: async (event) => {
		const { user } = event.locals;
		if (!user) redirect(302, '/sign-in');

		const token = generateToken(user.id);
		const res = await fetchAdmin(
			`/api/external/support/tickets/${event.params.id}/close`,
			{ method: 'POST', token }
		);

		if (!res.ok) {
			logger.error('Failed to close support ticket', {
				reason: res.reason,
				status: res.status,
				ticketId: event.params.id,
				distinctId: user.id
			});
			return fail(500, { error: 'Could not close ticket. Please try again.' });
		}

		return { success: true };
	}
};
