import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { type RequestEvent } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { adminForwardHeaders } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';
import { generateToken } from '$lib/server/utils';

/** Cancels the professional's shift and sets the flash message either way. */
export async function cancelShift(event: RequestEvent): Promise<boolean> {
	const userId = event.locals.user!.id;
	const workdayId = (await event.request.formData()).get('workdayId');

	try {
		const res = await fetch(
			`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/cancelWorkdayForCandidate/${workdayId}`,
			{
				method: 'POST',
				headers: {
					...adminForwardHeaders(),
					Authorization: `Bearer ${generateToken(userId)}`,
					'Content-Type': 'application/json'
				}
			}
		);
		if (!res.ok || !(await res.json()).success) {
			throw new Error('Cancellation was refused');
		}
		setFlash({ type: 'success', message: 'Your shift was cancelled.' }, event);
		return true;
	} catch (error) {
		logger.error('Failed to cancel workday shift', { error, workdayId, distinctId: userId });
		setFlash({ type: 'error', message: "We couldn't cancel your shift. Please try again." }, event);
		return false;
	}
}
