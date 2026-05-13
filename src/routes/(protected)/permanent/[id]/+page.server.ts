import type { PageServerLoad } from './$types';
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { getSavedJobs } from '$lib/server/cache/cacheUtils';
import { generateToken } from '$lib/server/utils';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { requisitionApplicationSchema } from '$lib/config/zod-schemas';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const { id } = event.params;
	const user = event.locals.user;

	if (!user) {
		redirect(302, '/sign-in');
	}

	const token = generateToken(user.id);

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}

	const [requisitionRes, appliedRes] = await Promise.all([
		fetchAdmin<any>(`/api/external/getRequisitionDetails/${id}`),
		fetchAdmin<any[]>('/api/external/getAppliedRequisitions', { token })
	]);

	let savedOpenings: number[] = [];
	try {
		savedOpenings = await getSavedJobs(user.id, token);
	} catch (error) {
		logger.error('Failed to load saved jobs', { error, distinctId: user.id });
	}

	const applyForm = await superValidate(event, requisitionApplicationSchema);
	const requisition = requisitionRes.ok ? (requisitionRes.data as { id: number }) : null;
	const appliedOpenings = appliedRes.ok ? (appliedRes.data ?? []) : [];

	return {
		requisition: requisition as any,
		saved: requisition ? savedOpenings.includes(requisition.id) : false,
		appliedToOpening: requisition
			? (appliedOpenings as any[])
					.map((opening) => opening?.application?.requisitionId)
					.includes(requisition.id)
			: false,
		applyForm,
		loadError: requisitionRes.ok && appliedRes.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	applyForOpening: async (event: RequestEvent) => {
		const userId = event.locals.user?.id;
		const requisitionId = event.params.id;
		const token = generateToken(userId);
		const form = await superValidate(event, requisitionApplicationSchema);

		if (!userId || !requisitionId) {
			return fail(400, {
				form: { ...form, errors: { message: 'Missing required information' } }
			});
		}

		const idAsNum = Number(requisitionId);

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const req = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/applyForRequisition`, {
				method: 'POST',
				body: JSON.stringify({ requisitionId: idAsNum }),
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			if (!req.ok) {
				const errorText = await req.text();
				logger.error('applyForRequisition non-ok response', {
					status: req.status,
					body: errorText.slice(0, 500),
					requisitionId: idAsNum,
					distinctId: userId
				});
				return fail(req.status, {
					form: { ...form, errors: { message: 'Failed to submit application' } }
				});
			}

			try {
				const result = await req.json();
				if (result.success) {
					return message(form, 'Application submitted successfully!');
				} else {
					return setError(form, result.message || 'Application submission failed');
				}
			} catch (jsonError) {
				logger.error('applyForRequisition response JSON parse error', {
					error: jsonError,
					requisitionId: idAsNum,
					distinctId: userId
				});
				return fail(500, {
					form: { ...form, errors: { message: 'Invalid response from server' } }
				});
			}
		} catch (error) {
			logger.error('Application submission threw', {
				error,
				requisitionId: idAsNum,
				distinctId: userId
			});
			return fail(500, {
				form: { ...form, errors: { message: 'Something went wrong' } }
			});
		}
	}
};
