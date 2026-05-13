import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { superValidate, message, setError } from 'sveltekit-superforms/server';
import { documentUrlSchema } from '$lib/config/zod-schemas';
import { setFlash } from 'sveltekit-flash-message/server';
import { z } from 'zod';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;

	if (!user) {
		return redirect(302, '/sign-in');
	}

	if (!user.completedOnboarding && user.onboardingStep > 4) {
		redirect(302, '/onboarding/awaiting-approval');
	}

	const token = generateToken(user.id);
	const res = await fetchAdmin<any>('/api/external/getCandidateProfile', { token });
	const documentsForm = await superValidate(event, documentUrlSchema);
	const skipForm = await superValidate({ userId: user.id }, z.object({ userId: z.string() }));

	return {
		user,
		profile: res.ok ? res.data : null,
		documentsForm,
		skipForm,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions: Actions = {
	skipUpload: async (event) => {
		const { locals } = event;
		const { user } = locals;
		if (!user) {
			return redirect(302, '/sign-in');
		}

		try {
			const form = await superValidate(event, z.object({ userId: z.string() }));

			if (!form.valid) {
				return fail(400, { form });
			}
			const userId = form.data.userId;

			if (userId !== user.id) {
				return fail(403, { message: 'Unauthorized' });
			}

			const token = generateToken(user.id);
			const response = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ onboardingStep: 5 })
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(response.status, 'Failed to update user');
			}

			setFlash({ type: 'success', message: 'Skipped document upload' }, event);
		} catch (err) {
			logger.error('Failed to skip onboarding documents', { error: err, distinctId: user.id });
			setFlash({ type: 'error', message: 'Failed to skip document upload' }, event);
			return fail(500, { message: 'Failed to skip document upload' });
		}
		return redirect(302, '/onboarding/awaiting-approval');
	},
	documentsUpload: async (event) => {
		const { locals, request } = event;
		const { user } = locals;

		if (!user) {
			return redirect(302, '/sign-in');
		}

		const form = await superValidate(request, documentUrlSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		const fileData = form.data.filesData;

		try {
			const token = generateToken(user.id);

			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/createCandidateDocument`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						type: 'OTHER',
						filesData: fileData
					})
				}
			);

			if (!response.ok) {
				const body = await response.text();
				logger.error('createCandidateDocument non-ok response', {
					status: response.status,
					body: body.slice(0, 500),
					distinctId: user.id
				});
				throw new Error(`Failed to update resume: ${response.statusText}`);
			}

			const userResponse = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ onboardingStep: 5 })
			});

			if (!userResponse.ok) {
				if (userResponse.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(userResponse.status, 'Failed to update onboarding step');
			}

			setFlash({ type: 'success', message: 'Documents uploaded successfully' }, event);
		} catch (err) {
			logger.error('Failed to upload onboarding documents', {
				error: err,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to update documents' }, event);
			return setError(form, 'Failed to update documents');
		}
		redirect(302, '/onboarding/awaiting-approval');
	}
};
