import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { recurrenceDayClaimSchema } from '$lib/config/zod-schemas.js';
import { generateToken } from '$lib/server/utils.js';
import { fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { RequestEvent } from './$types';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE, adminForwardHeaders } from '$lib/server/fetchAdmin';
import { getCandidateStatus, inactiveAccountMessage } from '$lib/server/candidateStatus';
import { logger } from '$lib/server/logger';

export const load = async (event) => {
	// A URL param rather than component state, so "show me the shifts my
	// availability is hiding" survives a refresh and can be shared with support.
	const showUnavailable = event.url.searchParams.get('showUnavailable') === '1';

	// Not cached while showing the unavailable set: the two variants are different
	// responses on the same path, and a 60s cache would serve one for the other.
	if (!showUnavailable) {
		event.setHeaders({
			'cache-control': 'max-age=60'
		});
	}
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/auth/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}
	const token = generateToken(user.id);

	const [workdaysRes, timesheetsRes, requisitionsRes] = await Promise.all([
		fetchAdmin<{ data: any[] }>('/api/external/getUpcomingWorkdaysForCandidate', { token }),
		fetchAdmin<{ data: any[] }>('/api/external/timesheets/getPendingTimesheetsForUser', {
			token
		}),
		fetchAdmin<{
			recurrenceDays: any[];
			certLocked?: any[];
			availability?: {
				availableDays: number[] | null;
				isCustomised: boolean;
				hiddenByAvailability: number;
			};
			workPreference?: {
				preference: 'TEMP' | 'PERMANENT' | 'BOTH' | null;
				excluded: { preference: string; message: string } | null;
			};
		}>(
			`/api/external/getUpcomingTempRequisitionsForCandidate${showUnavailable ? '?includeUnavailable=true' : ''}`,
			{ token }
		)
	]);

	return {
		user,
		// See calendar/+page.server.ts: the page used to declare `export let
		// applyForm`, which a +page.svelte never receives, so every fail() from
		// claimWorkdayShift was silently discarded.
		claimForm: await superValidate(event, recurrenceDayClaimSchema),
		workdays: workdaysRes.ok ? (workdaysRes.data.data ?? []) : [],
		timesheets: timesheetsRes.ok ? (timesheetsRes.data.data ?? []) : [],
		requisitions: requisitionsRes.ok ? (requisitionsRes.data.recurrenceDays ?? []) : [],
		// See permanent/+page.server.ts — drives the "shifts are hidden" banner.
		certLocked: requisitionsRes.ok ? (requisitionsRes.data.certLocked ?? []) : [],
		// Same purpose as certLocked, for the professional's own availability:
		// explain the absence rather than let shifts quietly disappear.
		hiddenByAvailability: requisitionsRes.ok
			? (requisitionsRes.data.availability?.hiddenByAvailability ?? 0)
			: 0,
		showUnavailable,
		// See permanent/+page.server.ts.
		workPreference: requisitionsRes.ok ? requisitionsRes.data.workPreference : undefined,
		loadError:
			workdaysRes.ok && timesheetsRes.ok && requisitionsRes.ok
				? undefined
				: ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	claimWorkdayShift: async (event: RequestEvent) => {
		const userId = event.locals.user?.id;
		const token = generateToken(userId);
		const form = await superValidate(event, recurrenceDayClaimSchema);
		const recurrenceDayId = form.data.recurrenceDayId;
		// Claiming a shift on a day they marked off is their own override, so the
		// admin app permits it only when the intent is explicit — otherwise the
		// "Show them anyway" banner would surface a shift that cannot be claimed.
		const acknowledgeUnavailable =
			(await event.request.clone().formData().catch(() => null))?.get('acknowledgeUnavailable') ===
			'true';

		if (!userId || !recurrenceDayId) {
			return fail(400, {
				form: { ...form, errors: { _errors: ['Missing required information'] } }
			});
		}

		if (!form.valid) {
			return fail(400, { form });
		}

		// Block non-active candidates before the cross-app request.
		const status = await getCandidateStatus(userId);
		if (status !== 'ACTIVE') {
			return fail(403, {
				form: { ...form, errors: { _errors: [inactiveAccountMessage(status)] } }
			});
		}

		try {
			const req = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/applyForTempRequisition`, {
				method: 'POST',
				body: JSON.stringify({ recurrenceDayId, acknowledgeUnavailable }),
				headers: {
					...adminForwardHeaders(),
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			const responseData = await req.json();

			if (!req.ok || !responseData.success) {
				return fail(req.status || 403, {
					form: {
						...form,
						errors: {
							_errors: [responseData.message || 'Failed to claim shift']
						}
					}
				});
			}
			setFlash(
				{
					type: 'success',
					message: 'Successfully claimed shift.'
				},
				event
			);
			return message(form, 'Successfully claimed shift!');
		} catch (error) {
			logger.error('Failed to claim workday shift', {
				error,
				recurrenceDayId,
				distinctId: userId
			});
			setFlash(
				{
					type: 'error',
					message: 'Something went wrong while claiming the shift'
				},
				event
			);
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Something went wrong while claiming the shift']
					}
				}
			});
		}
	}
};
