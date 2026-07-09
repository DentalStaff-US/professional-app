import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const userTable = pgTable('users', {
	id: text('id').notNull().primaryKey(),
	provider: text('provider').notNull().default('email'),
	providerId: text('provider_id').notNull().default(''),
	email: text('email').notNull().unique(),
	// Better Auth core requires `name`; kept alongside first/last (set on signup).
	name: text('name'),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	avatarUrl: text('avatar_url'),
	role: text('role').notNull().default('CANDIDATE'),
	verified: boolean('verified').notNull().default(false),
	receiveEmail: boolean('receive_email').notNull().default(true),
	// Mirror of receiveEmail for SMS. Owned + migrated by the admin app on the
	// shared DB; declared here so this app's queries see the column.
	receiveSms: boolean('receive_sms').notNull().default(true),
	password: text('password'),
	token: text('token').unique(),
	createdAt: timestamp('created_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull(),
	completedOnboarding: boolean('completed_onboarding').default(false),
	onboardingStep: integer('onboarding_step').default(1),
	blacklisted: boolean('blacklisted').default(false),
	stripeCustomerId: text('stripe_customer_id').unique(),
	timezone: text('timezone').default('America/New_York'),
	// Better Auth admin plugin fields
	banned: boolean('banned').default(false),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires', { withTimezone: true, mode: 'date' }),
	// Better Auth two-factor plugin flag
	twoFactorEnabled: boolean('two_factor_enabled').default(false)
});

export const sessionTable = pgTable('sessions', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull(),
	// Better Auth session fields (created by the admin app's migration on the shared DB)
	token: text('token').unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	impersonatedBy: text('impersonated_by'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

// Better Auth tables — declarations only. These tables are owned + migrated by
// the admin app (dental-staff-app) on the shared DB; the candidate app just
// references them so its Better Auth Drizzle adapter can read/write.
export const accountTable = pgTable('account', {
	id: text('id').notNull().primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'date' }),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
		withTimezone: true,
		mode: 'date'
	}),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()
});

export const verificationTable = pgTable('verification', {
	id: text('id').notNull().primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow()
});

export const twoFactorTable = pgTable('two_factor', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	secret: text('secret'),
	backupCodes: text('backup_codes')
});

export type User = typeof userTable.$inferInsert;
export type NewUser = typeof userTable.$inferInsert;
export type UpdateUser = Partial<typeof userTable.$inferInsert>;
export type Session = typeof sessionTable.$inferInsert;
