import { z } from 'zod';

/**
 * Normalize a US phone number to E.164 format ("+1XXXXXXXXXX").
 *
 *   "(386) 327-7843"     -> "+13863277843"  // 10 digits
 *   "13863277843"        -> "+13863277843"  // 11 digits, leading 1
 *   "+1 (386) 327-7843"  -> "+13863277843"  // 11 digits, leading 1
 *
 * Returns null for anything else (wrong digit count, leading digit other than
 * 1, etc). The app is US-only — anything that isn't a 10-digit US number with
 * an optional leading 1 is rejected.
 *
 * Mirrors `dental-staff-app/src/lib/_helpers/phone.ts`. The two apps are
 * separate SvelteKit projects so they each ship their own copy of this
 * helper; rules must stay in sync across both.
 */
export function normalizeUSPhone(phone: string | null | undefined): string | null {
	if (!phone) return null;
	const digits = phone.replace(/\D/g, '');
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	return null;
}

export function isValidUSPhone(phone: string | null | undefined): boolean {
	return normalizeUSPhone(phone) !== null;
}

/**
 * Display a stored canonical "+1XXXXXXXXXX" as "(XXX) XXX-XXXX".
 * Falls back to the raw value if it doesn't look canonical.
 */
export function formatUSPhoneForDisplay(phone: string | null | undefined): string {
	if (!phone) return '';
	const digits = phone.replace(/\D/g, '');
	const last10 = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
	if (last10.length !== 10) return phone;
	return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
}

/**
 * Zod field for a US phone — validates AND normalizes on parse. Use as the
 * value for any phone column in a form schema. On a successful parse the
 * schema returns the canonical "+1XXXXXXXXXX" string, so the value the
 * action handler writes (or sends to the admin app via api/external/*) is
 * already normalized.
 *
 * Empty strings parse as null so an "optional" field with a blank input
 * doesn't trip the regex; pair with .nullable() / .optional() as needed.
 */
export function usPhoneField() {
	return z
		.string()
		.transform((value, ctx) => {
			if (value === '' || value == null) return null;
			const normalized = normalizeUSPhone(value);
			if (!normalized) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enter a valid US phone number (10 digits, or 11 starting with 1).'
				});
				return z.NEVER;
			}
			return normalized;
		});
}
