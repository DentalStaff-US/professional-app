/**
 * Credential status for display in the candidate app.
 *
 * A deliberate COPY of the rules in
 * dental-staff-app/src/lib/server/certifications/certStatus.ts — the two apps are
 * separate repos with no shared package, and the admin app remains the authority.
 * This copy is presentational only: every gate decision is made server-side in
 * dental-staff-app and arrives here as data (`certLocked`, `effectiveExpiry`). If the
 * rules ever diverge, the admin app wins.
 *
 * Client-safe: no server imports, so it can be used directly in components.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const CERT_TIMEZONE = 'America/New_York';
export const CERT_EXPIRING_SOON_DAYS = 60;

export type CertState = 'NOT_REQUIRED' | 'MISSING' | 'VALID' | 'EXPIRING' | 'EXPIRED';

/** 'YYYY-MM-DD' for "today" in the business timezone (not the viewer's). */
export function todayInET(now: Date = new Date()): string {
	return formatInTimeZone(now, CERT_TIMEZONE, 'yyyy-MM-dd');
}

export function daysUntilExpiry(expiresOn: string, today: string = todayInET()): number {
	return differenceInCalendarDays(parseISO(expiresOn), parseISO(today));
}

export function certState(
	input: { requiresCertification: boolean; effectiveExpiry: string | null },
	today: string = todayInET()
): CertState {
	if (!input.requiresCertification) return 'NOT_REQUIRED';
	if (!input.effectiveExpiry) return 'MISSING';
	// Valid THROUGH the printed date; jobs are hidden from the next day.
	if (input.effectiveExpiry < today) return 'EXPIRED';
	return daysUntilExpiry(input.effectiveExpiry, today) <= CERT_EXPIRING_SOON_DAYS
		? 'EXPIRING'
		: 'VALID';
}

/** Short label + Tailwind classes for a badge. Null when there is nothing to say. */
export function certBadge(
	state: CertState,
	expiresOn: string | null,
	today: string = todayInET()
): { label: string; class: string } | null {
	switch (state) {
		case 'NOT_REQUIRED':
			// No noise on disciplines that need no credential.
			return null;
		case 'MISSING':
			return {
				label: 'Certificate needed',
				class: 'bg-red-50 text-red-700 ring-1 ring-red-200'
			};
		case 'EXPIRED':
			return {
				label: `Expired ${formatCertDate(expiresOn)} — jobs hidden`,
				class: 'bg-red-50 text-red-700 ring-1 ring-red-200'
			};
		case 'EXPIRING': {
			const days = expiresOn ? daysUntilExpiry(expiresOn, today) : 0;
			return {
				label:
					days <= 0
						? 'Expires today'
						: `Expires in ${days} day${days === 1 ? '' : 's'}`,
				class: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
			};
		}
		case 'VALID':
			return {
				label: `Valid through ${formatCertDate(expiresOn)}`,
				class: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
			};
	}
}

/** 'Apr 30, 2027' from 'YYYY-MM-DD', parsed as a calendar date (no tz shift). */
export function formatCertDate(value: string | null | undefined): string {
	if (!value) return '—';
	const iso = value.slice(0, 10);
	return formatInTimeZone(parseISO(`${iso}T00:00:00Z`), 'UTC', 'MMM d, yyyy');
}
