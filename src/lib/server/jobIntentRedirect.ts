/**
 * Send a signed-in, eligible candidate back to the public job they were viewing
 * before they signed up / signed in (see jobIntent.ts for the cookie).
 *
 * Call from a load that eligible candidates land on (dashboard, the
 * awaiting-approval → dashboard hop). It either throws a redirect or returns.
 *
 * Loop safety: the cookie is cleared on every terminal outcome BEFORE the
 * redirect is thrown, so the destination's own load never sees it again. The
 * only outcomes that keep the cookie are "not eligible yet" (no redirect at
 * all) and a transient admin-API failure (no redirect; retried next load).
 */
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import { fetchAdmin } from '$lib/server/fetchAdmin';
import { generateToken } from '$lib/server/utils';
import { getCandidateStatus } from '$lib/server/candidateStatus';
import { readJobIntent, clearJobIntent } from '$lib/server/jobIntent';
import { logger } from '$lib/server/logger';

export type ResolvedPublicJob = {
	requisitionId: number;
	permanent: boolean;
	firstOpenDate: string | null;
	open: boolean;
};

export const JOB_UNAVAILABLE_MESSAGE =
	'That job is no longer available — here are similar openings.';

/**
 * Pure decision: where an eligible candidate should go for a resolved job.
 * `null` job = admin returned 404.
 */
export function jobIntentDestination(job: ResolvedPublicJob | null): {
	location: string;
	unavailable: boolean;
} {
	if (!job) return { location: '/dashboard', unavailable: true };
	if (!job.open) {
		return { location: job.permanent ? '/permanent' : '/calendar', unavailable: true };
	}
	if (job.permanent) return { location: `/permanent/${job.requisitionId}`, unavailable: false };

	const params = new URLSearchParams();
	if (job.firstOpenDate && /^\d{4}-\d{2}-\d{2}$/.test(job.firstOpenDate)) {
		params.set('date', job.firstOpenDate);
	}
	params.set('req', String(job.requisitionId));
	return { location: `/calendar?${params.toString()}`, unavailable: false };
}

/**
 * Mirrors the gates on the destinations: /permanent/[id] and /calendar both
 * bounce to /onboarding unless completedOnboarding, and applying/claiming
 * requires candidate_status ACTIVE. Redirecting anyone else would either loop
 * through /onboarding or land them on a job they cannot act on.
 */
async function isEligibleToApply(event: RequestEvent): Promise<boolean> {
	const user = event.locals.user;
	if (!user?.completedOnboarding) return false;
	return (await getCandidateStatus(user.id)) === 'ACTIVE';
}

export async function resolveJobIntentRedirect(event: RequestEvent): Promise<void> {
	const user = event.locals.user;
	if (!user) return;

	const intent = readJobIntent(event.cookies);
	if (!intent) return;

	// Not eligible yet: keep the cookie; the onboarding banner explains it.
	if (!(await isEligibleToApply(event))) return;

	const res = await fetchAdmin<ResolvedPublicJob>(
		`/api/external/resolvePublicJob/${encodeURIComponent(intent.publicId)}`,
		{ token: generateToken(user.id) }
	);

	let job: ResolvedPublicJob | null;
	if (res.ok) {
		job = res.data;
		if (typeof job?.requisitionId !== 'number') {
			// Contract drift — treat as unavailable rather than redirect to /permanent/undefined.
			logger.error('resolvePublicJob returned an unexpected shape', {
				publicId: intent.publicId,
				distinctId: user.id
			});
			job = null;
		}
	} else if (res.reason === 'http' && res.status === 404) {
		job = null;
	} else {
		// Transient failure (network/timeout/5xx): keep the cookie, render normally.
		return;
	}

	clearJobIntent(event.cookies);
	const { location, unavailable } = jobIntentDestination(job);
	if (unavailable) {
		flashRedirect(302, location, { type: 'error', message: JOB_UNAVAILABLE_MESSAGE }, event);
	}
	redirect(302, location);
}
