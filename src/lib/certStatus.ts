/**
 * Credential status for display in the candidate app.
 *
 * A deliberate COPY of the rules in
 * dental-staff-app/src/lib/server/certifications/credentialStatus.ts — separate
 * repos, no shared package, and the admin app remains the authority. Presentational
 * only: every gate decision is made server-side and arrives here as data.
 *
 * TWO TRACKS, and the wording must never conflate them:
 *   LICENSE       — required for the discipline itself; fixed by uploading a document.
 *   CERTIFICATION — required by the professional's state; fixed by updating a date
 *                   on their Experience & Rates entry.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const CERT_TIMEZONE = 'America/New_York';
export const CERT_EXPIRING_SOON_DAYS = 60;
export const LICENSE_GRACE_DAYS = 30;

export type CredentialTrack = 'LICENSE' | 'CERTIFICATION';
export type CertState =
	| 'NOT_REQUIRED'
	| 'MISSING'
	| 'MISSING_GRACE'
	| 'VALID'
	| 'EXPIRING'
	| 'EXPIRED';

export type CredentialInput = {
	required: boolean;
	expiresOn: string | null;
	/** LICENSE only. */
	graceStartedOn?: string | null;
};

export function todayInET(now: Date = new Date()): string {
	return formatInTimeZone(now, CERT_TIMEZONE, 'yyyy-MM-dd');
}

export function daysUntil(date: string, today: string = todayInET()): number {
	return differenceInCalendarDays(parseISO(date), parseISO(today));
}

export function credentialState(c: CredentialInput, today: string = todayInET()): CertState {
	if (!c.required) return 'NOT_REQUIRED';
	if (!c.expiresOn) {
		if (!c.graceStartedOn) return 'MISSING';
		return daysUntil(c.graceStartedOn, today) + LICENSE_GRACE_DAYS > 0 ? 'MISSING_GRACE' : 'EXPIRED';
	}
	if (c.expiresOn < today) return 'EXPIRED';
	return daysUntil(c.expiresOn, today) <= CERT_EXPIRING_SOON_DAYS ? 'EXPIRING' : 'VALID';
}

export function graceDaysRemaining(c: CredentialInput, today: string = todayInET()): number | null {
	if (!c.required || c.expiresOn || !c.graceStartedOn) return null;
	return Math.max(0, daysUntil(c.graceStartedOn, today) + LICENSE_GRACE_DAYS);
}

/** 'Apr 30, 2027' from 'YYYY-MM-DD', read as a calendar date (no timezone shift). */
export function formatCertDate(value: string | null | undefined): string {
	if (!value) return '—';
	return formatInTimeZone(parseISO(`${String(value).slice(0, 10)}T00:00:00Z`), 'UTC', 'MMM d, yyyy');
}

const NOUN: Record<CredentialTrack, string> = {
	LICENSE: 'License',
	CERTIFICATION: 'Certification'
};

/**
 * Badge for one track. Null means render nothing.
 *
 * The professional's wording differs from the admin's on purpose: they need to know
 * what to do, not what staff should chase.
 */
export function credentialBadge(
	track: CredentialTrack,
	c: CredentialInput,
	today: string = todayInET()
): { label: string; class: string } | null {
	const state = credentialState(c, today);
	const noun = NOUN[track];

	switch (state) {
		case 'NOT_REQUIRED':
			return null;
		case 'MISSING':
			return {
				label: `${noun} needed`,
				class: 'bg-red-50 text-red-700 ring-1 ring-red-200'
			};
		case 'MISSING_GRACE': {
			const left = graceDaysRemaining(c, today) ?? 0;
			return {
				label: `${noun} needed — ${left} day${left === 1 ? '' : 's'} left`,
				class: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
			};
		}
		case 'EXPIRED':
			return {
				label: c.expiresOn
					? `${noun} expired ${formatCertDate(c.expiresOn)} — jobs hidden`
					: `${noun} still needed — jobs hidden`,
				class: 'bg-red-50 text-red-700 ring-1 ring-red-200'
			};
		case 'EXPIRING': {
			const days = c.expiresOn ? daysUntil(c.expiresOn, today) : 0;
			return {
				label:
					days <= 0 ? `${noun} expires today` : `${noun} expires in ${days} day${days === 1 ? '' : 's'}`,
				class: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
			};
		}
		case 'VALID':
			return {
				label: `${noun} valid through ${formatCertDate(c.expiresOn)}`,
				class: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
			};
	}
}
