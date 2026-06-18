import { fail, redirect } from '@sveltejs/kit';
import { setError, superValidate } from 'sveltekit-superforms/server';
import { setFlash } from 'sveltekit-flash-message/server';
import { userUpdatePasswordSchema } from '$lib/config/zod-schemas';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load = async (event) => {
	const form = await superValidate(event, userUpdatePasswordSchema);
	const token = event.url.searchParams.get('token');
	const linkError = event.url.searchParams.get('error');
	return {
		form,
		hasToken: Boolean(token) && !linkError
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, userUpdatePasswordSchema);

		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		const token = event.url.searchParams.get('token');
		if (!token) {
			return setError(
				form,
				'This password reset link is invalid or has expired. Please request a new one.'
			);
		}

		try {
			await auth.api.resetPassword({
				headers: event.request.headers,
				body: { token, newPassword: form.data.password }
			});
		} catch (e) {
			if (e instanceof APIError) {
				return setError(
					form,
					'This password reset link is invalid or has expired. Please request a new one.'
				);
			}
			console.error(e);
			return setError(
				form,
				'There was a problem resetting your password. Please contact support if you need further help.'
			);
		}

		setFlash(
			{ type: 'success', message: 'Your password has been updated. Please sign in.' },
			event
		);
		redirect(302, '/auth/sign-in');
	}
};
