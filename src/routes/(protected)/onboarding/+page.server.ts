import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { newProfileSchema, avatarUrlSchema } from '$lib/config/zod-schemas';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { setFlash } from 'sveltekit-flash-message/server';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;

	if (!user) {
		redirect(302, '/sign-in');
	}

	if (!user.completedOnboarding && user.onboardingStep > 1) {
		redirect(302, '/onboarding/experience');
	}

	const form = await superValidate(event, newProfileSchema);
	const avatarForm = await superValidate(event, avatarUrlSchema);

	return { user, form, avatarForm };
};

export const actions: Actions = {
	avatarUpload: async (event: RequestEvent) => {
		const { locals } = event;
		const { user } = locals;

		if (!user) {
			redirect(302, '/sign-in');
		}

		const userId = user.id;
		const token = generateToken(userId);
		const form = await superValidate(event, avatarUrlSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		const url = form.data.url;

		try {
			const response = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ avatarUrl: url })
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(response.status, 'Failed to update avatar');
			}

			setFlash({ type: 'success', message: 'Avatar updated Successfully' }, event);
			return message(form, 'Avatar updated Successfully');
		} catch (err) {
			logger.error('Failed to upload onboarding avatar', { error: err, distinctId: userId });
			setFlash({ type: 'error', message: 'Failed to update profile.' }, event);
			setError(form, 'Something went wrong');
		}
	},
	submitProfile: async (event: RequestEvent) => {
		const { locals } = event;
		const { user } = locals;

		if (!user) {
			redirect(302, '/sign-in');
		}

		const userId = user.id;
		const token = generateToken(userId);
		const form = await superValidate(event, newProfileSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		const profile = {
			...form.data
		};

		let status = false;

		try {
			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/onboarding/setupCandidateProfile`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(profile)
				}
			);

			if (!response.ok) {
				if (response.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(response.status, 'Failed to update profile');
			}
			setFlash({ type: 'success', message: 'Profile updated Successfully' }, event);
			status = true;
		} catch (err) {
			logger.error('Failed to setup onboarding profile', { error: err, distinctId: userId });
			setFlash({ type: 'error', message: 'Failed to update profile.' }, event);
			setError(form, 'Something went wrong');
		}

		if (status === true) {
			redirect(302, '/onboarding/experience');
		}
		return { form };
	}
};
