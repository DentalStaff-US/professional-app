import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { fetchAdmin } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';
import { generateToken } from '$lib/server/utils';

/**
 * Form action behind MessagePracticeDialog: start a conversation with the
 * practice, or add to the one that exists. The admin API checks the timesheet
 * or shift is theirs and that neither side has blocked the other.
 */
export async function messagePractice(
	event: RequestEvent,
	link: { timesheetId: string } | { workdayId: string }
) {
	const { user } = event.locals;
	if (!user) throw error(401, 'Unauthorized');

	const formData = await event.request.formData();
	const body = String(formData.get('body') ?? '').trim();
	if (!body) return fail(400, { messageError: 'Write a message to send.', body });

	const res = await fetchAdmin<{ conversationId: string }>(
		'/api/external/inbox/startPracticeConversation',
		{ method: 'POST', token: generateToken(user.id), body: { ...link, body } }
	);

	if (!res.ok) {
		logger.error('Failed to start practice conversation', {
			...link,
			status: res.status,
			distinctId: user.id
		});
		const messageError =
			res.status === 403
				? "You can't message this practice. Contact DTSS support if you need help."
				: "Your message didn't send. Please try again.";
		return fail(res.status === 403 ? 403 : 502, { messageError, body });
	}

	throw redirect(303, `/inbox/${res.data.conversationId}`);
}
