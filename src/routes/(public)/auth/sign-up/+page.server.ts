import { fail, redirect } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { setError, superValidate } from 'sveltekit-superforms/server';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

import { userSchema } from '$lib/config/zod-schemas';
import type { PageServerLoad, PageServerLoadEvent, RequestEvent } from './$types';

const signUpSchema = userSchema.pick({
	firstName: true,
	lastName: true,
	email: true,
	password: true,
	terms: true
});

export const load: PageServerLoad = async (event: PageServerLoadEvent) => {
	if (event.locals.user) {
		redirect(302, '/dashboard');
	}
	const form = await superValidate(event, signUpSchema);
	return {
		form
	};
};

export const actions = {
	default: async (event: RequestEvent) => {
		const form = await superValidate(event, signUpSchema);

		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		try {
			const email = form.data.email.toLowerCase();

			// Creates the user (role defaults to CANDIDATE) + credential account +
			// session via Better Auth; the custom Argon2id hasher hashes the password
			// and sveltekitCookies sets the session cookie.
			await auth.api.signUpEmail({
				headers: event.request.headers,
				body: {
					email,
					password: form.data.password,
					name: `${form.data.firstName} ${form.data.lastName}`.trim(),
					firstName: form.data.firstName,
					lastName: form.data.lastName
				}
			});

			// Send the verification email (Better Auth issues the link).
			await auth.api.sendVerificationEmail({
				headers: event.request.headers,
				body: { email, callbackURL: '/auth/verify/success' }
			});

			setFlash(
				{
					type: 'success',
					message: 'Account created. Please check your email to verify your account.'
				},
				event
			);
		} catch (e) {
			if (!(e instanceof APIError)) {
				console.error(e);
			}
			setFlash({ type: 'error', message: 'Account was not able to be created.' }, event);
			return setError(form, 'email', 'A user with that email already exists.');
		}
		return { form };
	}
};
