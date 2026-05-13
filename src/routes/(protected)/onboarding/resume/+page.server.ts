import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { superValidate, message, setError } from 'sveltekit-superforms/server';
import { documentUrlSchema } from '$lib/config/zod-schemas';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;
	if (!user) {
		return redirect(302, '/sign-in');
	}

	if (!user.completedOnboarding && user.onboardingStep > 3) {
		redirect(302, '/onboarding/documents');
	}

	const token = generateToken(user.id);
	const res = await fetchAdmin<any>('/api/external/getCandidateProfile', { token });
	const resumeForm = await superValidate(event, documentUrlSchema);

	return {
		user,
		profile: res.ok ? res.data : null,
		resumeForm,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions: Actions = {
	resumeUpload: async (event) => {
		const { locals, request } = event;
		const { user } = locals;

		if (!user) {
			return redirect(302, '/sign-in');
		}

		const form = await superValidate(request, documentUrlSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		const url = form.data.url;
		const filename = form.data.filename;

		try {
			const token = generateToken(user.id);

			const profileReq = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/getCandidateProfile`,
				{
					method: 'GET',
					headers: { Authorization: `Bearer ${token}` }
				}
			);

			if (!profileReq.ok) {
				if (profileReq.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(profileReq.status, 'Failed to fetch profile');
			}
			const profile = await profileReq.json();

			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/createCandidateDocument`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						url: url,
						candidateId: profile.id,
						type: 'RESUME',
						filename: filename
					})
				}
			);

			if (!response.ok) {
				throw new Error(`Failed to update resume: ${response.statusText}`);
			}

			const userResponse = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ onboardingStep: 4 })
			});

			if (!userResponse.ok) {
				if (userResponse.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(userResponse.status, 'Failed to update onboarding step');
			}

			setFlash({ type: 'success', message: 'Resume uploaded successfully' }, event);
			return message(form, 'Resume uploaded successfully');
		} catch (err) {
			logger.error('Failed to upload onboarding resume', { error: err, distinctId: user.id });
			setFlash({ type: 'error', message: 'Failed to update resume' }, event);
			return setError(form, 'Failed to update resume');
		}
	}
};
