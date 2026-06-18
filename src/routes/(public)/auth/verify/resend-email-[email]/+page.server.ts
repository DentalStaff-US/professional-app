import { auth } from '$lib/server/auth';
import { getUserByEmail } from '$lib/server/database/user-model';

export async function load(event) {
	try {
		const email = decodeURIComponent(event.params.email) as string;
		const user = await getUserByEmail(email);

		let heading = 'Email Verification Problem';
		let message =
			'A new email could not be sent. Please contact support if you feel this was an error.';

		if (user) {
			heading = 'Email Verification Sent';
			message =
				'A new verification email was sent.  Please check your email for the message. (Check the spam folder if it is not in your inbox)';
			// Better Auth re-issues the verification link via sendVerificationEmail.
			await auth.api.sendVerificationEmail({
				headers: event.request.headers,
				body: { email, callbackURL: '/auth/verify/success' }
			});
		}
		return { result: { heading: heading, message: message } };
	} catch (e) {
		console.error(e);
		return {
			result: {
				heading: 'Email Verification Problem',
				message:
					'A new email could not be sent. Please contact support if you feel this was an error.'
			}
		};
	}
}
