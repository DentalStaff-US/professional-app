import type { PageServerLoad } from './$types';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

const messageSchema = z.object({
	body: z.string().min(1, 'Message cannot be empty'),
	isSystemMessage: z.boolean().default(false)
});

export const load: PageServerLoad = async (event) => {
	const { id } = event.params;
	const { user } = event.locals;
	const userId = user?.id;

	if (!user) {
		redirect(302, '/sign-in');
	}

	const token = generateToken(userId);
	const res = await fetchAdmin<any>(`/api/external/inbox/getConversationDetails/${id}`, {
		token
	});
	const form = await superValidate(event, messageSchema);

	return {
		user,
		form,
		conversation: res.ok ? res.data : null,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	default: async (event) => {
		const { user } = event.locals;
		const userId = user?.id;

		if (!user) {
			redirect(302, '/sign-in');
		}

		const token = generateToken(userId);
		const form = await superValidate(event, messageSchema);
		const { id } = event.params;

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/inbox/sendMessage/${id}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						senderId: event?.locals?.user?.id,
						body: form.data.body,
						isSystemMessage: form.data.isSystemMessage
					})
				}
			);

			if (!response.ok) {
				const error = await response.json();
				return fail(response.status, {
					form,
					error: error.message || 'Failed to send message'
				});
			}

			form.data.body = '';

			return { form, success: true };
		} catch (error) {
			logger.error('Failed to send inbox message', {
				error,
				conversationId: id,
				distinctId: userId
			});
			return fail(500, {
				form,
				error: 'Failed to send message. Please try again.'
			});
		}
	}
} satisfies Actions;
