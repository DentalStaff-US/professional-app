import { fail, redirect } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { setError, superValidate } from 'sveltekit-superforms/server';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { userSchema } from '$lib/config/zod-schemas';
import { getUserByEmail } from '$lib/server/database/user-model';
import { formatBanMessage } from '$lib/_helpers/banMessage';

const signInSchema = userSchema.pick({
	email: true,
	password: true
});

export const load = async (event) => {
	if (event.locals.user) {
		redirect(302, '/dashboard');
	}
	const form = await superValidate(event, signInSchema);
	return {
		form
	};
};

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, signInSchema);

		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		const email = form.data.email.toLowerCase();

		try {
			// Better Auth verifies the password with the custom Argon2id verifier
			// (legacy hashes keep working) and sets the session cookie.
			const result = await auth.api.signInEmail({
				headers: event.request.headers,
				body: { email, password: form.data.password }
			});

			if (result && 'twoFactorRedirect' in result && result.twoFactorRedirect) {
				redirect(302, '/auth/two-factor');
			}

			setFlash({ type: 'success', message: 'Sign in successful.' }, event);
		} catch (e) {
			// `redirect()` throws — let it propagate.
			if (e && typeof e === 'object' && 'status' in e && 'location' in e) throw e;

			if (e instanceof APIError) {
				// Banned accounts: show a tailored reason + duration + support line.
				const banned = await getBannedDetailsIfAny(email);
				if (banned) {
					setFlash({ type: 'error', message: banned }, event);
					return setError(form, '', banned);
				}
			}
			setFlash({ type: 'error', message: 'The email or password is incorrect.' }, event);
			return setError(form, 'The email or password is incorrect.');
		}

		return { form };
	}
};

async function getBannedDetailsIfAny(email: string): Promise<string | null> {
	const user = await getUserByEmail(email);
	if (!user?.banned) return null;
	if (user.banExpires && new Date(user.banExpires).getTime() <= Date.now()) return null;
	return formatBanMessage(user.banReason, user.banExpires);
}
