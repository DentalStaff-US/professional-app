import type { PageServerLoad } from './$types';
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { getSavedJobs } from '$lib/server/cache/cacheUtils';
import { generateToken } from '$lib/server/utils';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { requisitionApplicationSchema } from '$lib/config/zod-schemas';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { getCandidateStatus, inactiveAccountMessage } from '$lib/server/candidateStatus';
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

	// getRequisitionDetails is now auth'd and returns `application` inline
	// (the candidate's own application for this req, if any). Dropped the
	// secondary getAppliedRequisitions call from this load — the new shape
	// supersedes it.
	const requisitionRes = await fetchAdmin<{
		id: number;
		status: string;
		application: { id: string; status: string; createdAt: string } | null;
	}>(`/api/external/getRequisitionDetails/${id}`, { token });

	let savedOpenings: number[] = [];
	try {
		savedOpenings = await getSavedJobs(user.id, token);
	} catch (error) {
		logger.error('Failed to load saved jobs', { error, distinctId: user.id });
	}

	const applyForm = await superValidate(event, requisitionApplicationSchema);
	const requisition = requisitionRes.ok ? requisitionRes.data : null;

	const myApplicationStatus = (requisition?.application?.status ?? null) as
		| 'PENDING'
		| 'APPROVED'
		| 'DENIED'
		| null;
	const reqStatus = requisition?.status ?? null;
	const canApply = !!requisition && reqStatus === 'OPEN' && myApplicationStatus === null;

	return {
		requisition: requisition as any,
		saved: requisition ? savedOpenings.includes(requisition.id) : false,
		myApplicationStatus,
		reqStatus,
		canApply,
		applyForm,
		loadError: requisitionRes.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
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

		// Block non-active candidates before the cross-app request.
		const status = await getCandidateStatus(userId);
		if (status !== 'ACTIVE') {
			return fail(403, {
				form: { ...form, errors: { message: inactiveAccountMessage(status) } }
			});
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
