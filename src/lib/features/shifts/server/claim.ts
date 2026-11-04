import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { fail, type RequestEvent } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { message, superValidate } from 'sveltekit-superforms/server';
import { recurrenceDayClaimSchema } from '$lib/config/zod-schemas.js';
import { getCandidateStatus, inactiveAccountMessage } from '$lib/server/candidateStatus';
import { adminForwardHeaders } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';
import { generateToken } from '$lib/server/utils.js';

/** Form action behind ClaimShiftSheet, shared by every screen that lists open shifts. */
export async function claimShift(event: RequestEvent) {
	const userId = event.locals.user?.id;
	const token = generateToken(userId);
	// Read the body once: superValidate(event) would consume it, and a later
	// request.clone() then throws 'unusable' — every claim failed that way.
	const formData = await event.request.formData();
	const form = await superValidate(formData, recurrenceDayClaimSchema);
	const recurrenceDayId = form.data.recurrenceDayId;
	// Claiming a shift on a day they marked off is their own override, so the
	// admin app permits it only when the intent is explicit — otherwise the
	// "Show them anyway" banner would surface a shift that cannot be claimed.
	const acknowledgeUnavailable = formData.get('acknowledgeUnavailable') === 'true';

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
