// lib/server/auth.ts — Better Auth instance for the candidate portal.
// Near-mirror of the admin app's auth.ts (dental-staff-app), pointed at the
// SAME shared Postgres tables. Differs only in cookie prefix + baseURL so the
// two apps keep deliberately segregated sessions. Replaces lib/server/lucia.ts.
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, twoFactor, emailOTP, oneTimeToken } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { Argon2id } from 'oslo/password';
import { env } from '$env/dynamic/private';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';

import db from '$lib/server/database/drizzle';
import {
	userTable,
	sessionTable,
	accountTable,
	verificationTable,
	twoFactorTable
} from '$lib/server/database/drizzle-schemas';
import { ac, roles } from '$lib/permissions';
import { EmailService } from '$lib/server/email/emailService';
import { BASE_URL } from '$lib/config/constants';

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days (matches Lucia)

export const auth = betterAuth({
	appName: 'Dental Temps Staffing Solutions',
	baseURL: BASE_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [BASE_URL, PUBLIC_CLIENT_APP_DOMAIN].filter(Boolean) as string[],

	database: drizzleAdapter(db, {
		provider: 'pg',
		// Keys MUST match each model's resolved modelName: user→'users',
		// session→'sessions', account/verification/twoFactor unchanged.
		schema: {
			users: userTable,
			sessions: sessionTable,
			account: accountTable,
			verification: verificationTable,
			twoFactor: twoFactorTable
		}
	}),

	user: {
		modelName: 'users',
		fields: {
			emailVerified: 'verified',
			image: 'avatarUrl'
		},
		additionalFields: {
			firstName: { type: 'string', required: true, input: true },
			lastName: { type: 'string', required: true, input: true },
			provider: { type: 'string', required: false, input: false },
			providerId: { type: 'string', required: false, input: false },
			receiveEmail: { type: 'boolean', required: false, input: false, defaultValue: true },
			completedOnboarding: {
				type: 'boolean',
				required: false,
				input: false,
				defaultValue: false
			},
			onboardingStep: { type: 'number', required: false, input: false, defaultValue: 1 },
			stripeCustomerId: { type: 'string', required: false, input: false },
			timezone: {
				type: 'string',
				required: false,
				input: false,
				defaultValue: 'America/New_York'
			}
		}
	},
	session: {
		modelName: 'sessions',
		expiresIn: SESSION_EXPIRES_IN_SECONDS
	},
	account: { modelName: 'account' },
	verification: { modelName: 'verification' },

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		password: {
			hash: async (password) => new Argon2id().hash(password),
			verify: async ({ hash, password }) => new Argon2id().verify(hash, password)
		},
		sendResetPassword: async ({ user, url }) => {
			await new EmailService().sendEmail({
				to: [{ email: user.email }],
				subject: 'Reset your password',
				html: `<p>We received a request to reset your password.</p>
					<p><a href="${url}">Click here to reset your password</a></p>
					<p>If you did not request this, you can safely ignore this email.</p>`
			});
		}
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await new EmailService().sendEmail({
				to: [{ email: user.email }],
				subject: 'Verify your email address',
				html: `<p>Welcome to Dental Temps Staffing Solutions.</p>
					<p><a href="${url}">Click here to verify your email address</a></p>`
			});
		}
	},

	// Distinct cookie prefix from the admin app preserves session segregation.
	advanced: {
		cookiePrefix: 'dtss-candidate'
	},

	plugins: [
		admin({
			ac,
			roles,
			adminRoles: ['SUPERADMIN'],
			defaultRole: 'CANDIDATE',
			bannedUserMessage:
				'Your account has been suspended. Please contact support if you believe this is a mistake.'
		}),
		twoFactor(),
		emailOTP({
			async sendVerificationOTP({ email, otp }) {
				await new EmailService().sendEmail({
					to: [{ email }],
					subject: 'Your verification code',
					html: `<p>Your one-time verification code is:</p><p style="font-size:20px"><strong>${otp}</strong></p>`
				});
			}
		}),
		// Receives cross-app impersonation handoffs from the admin app.
		oneTimeToken(),
		// MUST be last.
		sveltekitCookies(getRequestEvent)
	]
});

export type Auth = typeof auth;
export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session.session;

// App-facing user with Lucia-compatible aliases added in hooks.server.ts.
// Several fields are pinned non-null to match the shape the candidate app's
// pages relied on under Lucia (the hooks coalesce them from the DB defaults).
export type AppUser = Omit<
	AuthUser,
	'role' | 'onboardingStep' | 'completedOnboarding' | 'timezone'
> & {
	role: string;
	onboardingStep: number;
	completedOnboarding: boolean;
	timezone: string;
	userId: string;
	verified: boolean;
	avatarUrl: string | null;
};
