import { z } from 'zod';
import { usPhoneField } from '$lib/_helpers/phone';

export type Primitive = string | number | boolean | null;

export type JsonType = Primitive | { [key: PropertyKey]: JsonType } | JsonType[];

export const zJsonString = z.string().transform((str, ctx): JsonType => {
	try {
		return JSON.parse(str);
	} catch (e) {
		ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
		return z.NEVER;
	}
});

export const userSchema = z.object({
	firstName: z
		.string({ required_error: 'First Name is required' })
		.min(1, { message: 'First Name is required' })
		.trim(),
	lastName: z
		.string({ required_error: 'Last Name is required' })
		.min(1, { message: 'Last Name is required' })
		.trim(),
	email: z
		.string({ required_error: 'Email is required' })
		.email({ message: 'Please enter a valid email address' }),
	password: z
		.string({ required_error: 'Password is required' })
		.min(6, { message: 'Password must be at least 6 characters' })
		.trim(),
	confirmPassword: z
		.string({ required_error: 'Password is required' })
		.min(6, { message: 'Password must be at least 6 characters' })
		.trim(),
	//terms: z.boolean({ required_error: 'You must accept the terms and privacy policy' }),
	role: z
		.enum(['USER', 'PREMIUM', 'ADMIN'], { required_error: 'You must have a role' })
		.default('USER'),
	verified: z.boolean().default(false),
	terms: z.literal<boolean>(true, {
		errorMap: () => ({ message: 'You must accept the terms & privacy policy' })
	}),
	token: z.string().optional(),
	receiveEmail: z.boolean().default(true),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export type UserSchema = typeof userSchema;

export const userUpdatePasswordSchema = userSchema
	.pick({ password: true, confirmPassword: true })
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				code: 'custom',
				message: 'Password and Confirm Password must match',
				path: ['password']
			});
			ctx.addIssue({
				code: 'custom',
				message: 'Password and Confirm Password must match',
				path: ['confirmPassword']
			});
		}
	});

export type UserUpdatePasswordSchema = typeof userUpdatePasswordSchema;

export const requisitionApplicationSchema = z.object({
	requisitionId: z.number()
});

export type RequisitionApplicationSchema = typeof requisitionApplicationSchema;

export const recurrenceDayClaimSchema = z.object({
	recurrenceDayId: z.string().uuid()
});

export type RecurrenceDayClaimSchema = typeof recurrenceDayClaimSchema;

export const newProfileSchema = z.object({
	completeAddress: z.string().optional(),
	lat: z.string(),
	lon: z.string(),
	// Granular components from the address picker; the admin app normalizes and
	// stores these so professionals can be filtered by city/state/zip.
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zipcode: z.string().optional(),
	hourlyRateMin: z.number(),
	hourlyRateMax: z.number(),
	cellPhone: usPhoneField().nullable().optional(),
	citizenship: z.string().optional(),
	birthday: z.string().optional(),
	regionId: z.string().optional()
});
export type NewProfileSchema = typeof newProfileSchema;

export const updateProfileSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
	hourlyRateMin: z.number().nullable().optional(),
	hourlyRateMax: z.number().nullable().optional(),
	completeAddress: z.string().optional(),
	lat: z.string().optional(),
	lon: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zipcode: z.string().optional(),
	cellPhone: usPhoneField().nullable().optional(),
	citizenship: z.string().optional(),
	birthday: z.string().optional(),
	regionId: z.string().optional(),
	timezone: z.string().optional()
});
export type UpdateProfileSchema = typeof newProfileSchema;

export const newCandidateDisciplinesSchema = z.object({
	disciplines: z
		.array(
			z
				.object({
					disciplineId: z.string().min(1, 'Discipline is required'),
					experienceLevelId: z.string().min(1, 'Experience level is required'),
					preferredHourlyMin: z.coerce.number().min(0, 'Minimum rate must be at least 0').int(),
					preferredHourlyMax: z.coerce.number().min(0, 'Maximum rate must be at least 0').int()
				})
				.refine((data) => data.preferredHourlyMax >= data.preferredHourlyMin, {
					message: 'Maximum rate must be greater than or equal to minimum rate',
					path: ['preferredHourlyMax']
				})
		)
		.min(1, 'Please select at least one discipline')
});

export type NewCandidateDisciplinesSchema = typeof newCandidateDisciplinesSchema;

export const fileUploadSchema = z.object({
	file: z.instanceof(File).refine((f) => f.size < 2 * 1024 * 1024, 'Max 2MB upload size.')
});

export type FileUploadSchema = typeof fileUploadSchema;

export const multiFileUploadSchema = z.object({
	files: z
		.instanceof(File)
		.refine((f) => f.size < 2 * 1024 * 1024, 'Max 2MB upload size.')
		.array()
});

export type MultiFileUploadSchema = typeof multiFileUploadSchema;

export const avatarUrlSchema = z.object({ url: z.string() });

export type AvatarUrlSchema = typeof avatarUrlSchema;

export const documentUrlSchema = z.object({
	type: z.enum(['RESUME', 'LICENSE', 'CERTIFICATE', 'OTHER']).optional(),
	filename: z.string().optional(),
	url: z.string().optional(),
	urls: z.array(z.string()).optional(),
	createdAt: z.date().optional(),
	filesData: zJsonString.optional()
});

export const addExpenseSchema = z.object({
	description: z.string().min(1, 'Description is required').max(500),
	amountDollars: z.number({ invalid_type_error: 'Amount must be a number' }).positive()
});
export type AddExpenseSchema = typeof addExpenseSchema;
