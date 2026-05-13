import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { updateProfileSchema, avatarUrlSchema } from '$lib/config/zod-schemas';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { STATES } from '$lib/config/constants';
import { format } from 'date-fns';
import { setFlash } from 'sveltekit-flash-message/server';
import { updateUser } from '$lib/server/database/user-model';
import { EmailService } from '$lib/server/email/emailService';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;

	if (!user) {
		redirect(302, '/sign-in');
	}

	const token = generateToken(user.id);
	const profileRes = await fetchAdmin<any>('/api/external/getCandidateProfile', {
		token
	});

	const avatarForm = await superValidate(event, avatarUrlSchema);

	if (!profileRes.ok) {
		const form = await superValidate({}, updateProfileSchema);
		return {
			user,
			form,
			avatarForm,
			profile: null,
			loadError: ADMIN_LOAD_ERROR_MESSAGE
		};
	}

	const profile = profileRes.data;
	const form = await superValidate(
		{
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			timezone: user.timezone,
			...profile,
			birthday: profile.birthday ? format(new Date(profile.birthday), 'yyyy-MM-dd') : '',
			address: profile.address || '',
			state:
				profile.state && profile.state.length > 0
					? STATES.find(
							(state) => state.name == profile.state || state.abbreviation === profile.state
						)?.abbreviation
					: ''
		},
		updateProfileSchema
	);

	return { user, form, avatarForm, profile };
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
			logger.error('Failed to update avatar', { error: err, distinctId: userId });
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
		const form = await superValidate(event, updateProfileSchema);

		const emailService = new EmailService();

		if (!form.valid) {
			return fail(400, { form });
		}

		const userData = {
			email: form.data.email,
			firstName: form.data.firstName,
			lastName: form.data.lastName,
			timezone: form.data.timezone
		};

		const candidateData = {
			birthday: form.data.birthday,
			completeAddress: form.data.completeAddress,
			lat: form.data.lat,
			lon: form.data.lon,
			cellPhone: form.data.cellPhone,
			hourlyRateMin: form.data.hourlyRateMin,
			hourlyRateMax: form.data.hourlyRateMax
		};

		try {
			const candidateResponse = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateCandidateProfile`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(candidateData)
				}
			);

			const userResponse = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(userData)
			});

			if (!userResponse.ok || !candidateResponse.ok) {
				if (userResponse.status === 401 || candidateResponse.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(500, 'Failed to update profile');
			}

			if (userData.email && user.email !== userData.email) {
				await emailService.sendEmailAddressUpdateSuccessEmail(userData.email, user?.token);
				await emailService.sendPossibleHijackEmail(userData.email, user.email);
				await updateUser(user.id, { verified: false });
			}

			setFlash({ type: 'success', message: 'Profile updated Successfully' }, event);
		} catch (err) {
			logger.error('Failed to update profile', { error: err, distinctId: userId });
			setFlash({ type: 'error', message: 'Failed to update profile.' }, event);
			setError(form, 'Something went wrong');
		}
		return { form };
	}
};
