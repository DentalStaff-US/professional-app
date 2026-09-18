import { fail, redirect } from '@sveltejs/kit';
import { REF_COOKIE_NAME, parseRefCookie } from '$lib/server/affiliate/refCookie';
import { fetchAdmin } from '$lib/server/fetchAdmin';
import { generateToken } from '$lib/server/utils';
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
			const signUpResult = await auth.api.signUpEmail({
				headers: event.request.headers,
				body: {
					email,
					password: form.data.password,
					name: `${form.data.firstName} ${form.data.lastName}`.trim(),
					firstName: form.data.firstName,
					lastName: form.data.lastName
				}
			});

			// Attribute the affiliate referral, if any. This app owns no affiliate
			// tables, so the write happens in dental-staff-app.
			//
			// The endpoint derives referredUserId from the JWT and never from the
			// body, so this call can only ever attribute THIS user — it is
			// structurally incapable of forging someone else's attribution.
			//
			// Non-blocking: fetchAdmin returns a discriminated result rather than
			// throwing, and a failed attribution must never fail a signup. The
			// cookie is left in place so a retry is possible.
			const referral = parseRefCookie(event.cookies.get(REF_COOKIE_NAME));
			if (referral && signUpResult?.user?.id) {
				const result = await fetchAdmin('/api/external/affiliate/attribute', {
					method: 'POST',
					token: generateToken(signUpResult.user.id),
					body: { code: referral.code, referredRole: 'CANDIDATE' }
				});
				if (result.ok) {
					event.cookies.delete(REF_COOKIE_NAME, { path: '/' });
				} else {
					console.error('affiliate attribution failed at signup', result);
				}
			}

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
