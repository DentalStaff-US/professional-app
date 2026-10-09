import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { setFlash } from 'sveltekit-flash-message/server';
import { generateToken } from '$lib/server/utils';
import { adminForwardHeaders, fetchAdmin } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';
import { todayInBusinessTz } from '$lib/components/availability/availability';

/**
 * Onboarding step 6 — availability.
 *
 * APPENDED, not inserted: every existing step number is untouched, so no
 * coordinated two-repo deploy is needed (the step-1→2 bump is hardcoded in the
 * admin app). `users.completed_onboarding` is driven by the data-completeness
 * predicate in the admin app's candidateCompleteness.ts, not by this counter, so
 * appending cannot strand anyone as "incomplete".
 *
 * Consequence, by design: anyone already at step >= 5 when this ships never sees
 * this page — the guard in onboarding/documents forwards them straight past it.
 * That is fine, because the default is already correct. They are reached instead
 * through Settings → Availability.
 *
 * SKIPPABLE, LOUDLY. The right answer for most people is "change nothing", and a
 * required step whose right answer is "change nothing" teaches people to click
 * through steps without reading — which devalues the steps that do matter
 * (resume, credentials). The documents step already ships a first-class skip, and
 * skipping THERE costs real money.
 */
const ONBOARDING_STEP = 6;

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;
	if (!user) redirect(302, '/sign-in');

	// `>` and never `<`. onboarding_step is NULL for admin-created and seeded
	// professionals; `null > 6` is false (safe) but `null < 6` is TRUE, which would
	// bounce every one of them back to the start of onboarding. All four existing
	// guards use `>` for exactly this reason.
	if (!user.completedOnboarding && user.onboardingStep > ONBOARDING_STEP) {
		redirect(302, '/onboarding/awaiting-approval');
	}

	const today = todayInBusinessTz();

	// Best-effort: a failed read must not block onboarding. A fresh professional has
	// nothing set anyway, so the editor opens on the default-available state.
	const res = await fetchAdmin<{
		availableDays: number[] | null;
		blackouts: Array<{ date: string }>;
	}>(`/api/external/getCandidateAvailability?from=${today}`, { token: generateToken(user.id) });

	return {
		user,
		today,
		availableDays: res.ok ? res.data.availableDays : null,
		blockedDates: res.ok ? res.data.blackouts.map((b) => b.date) : []
	};
};

async function advanceStep(event: RequestEvent, userId: string) {
	const response = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
		method: 'POST',
		headers: {
			...adminForwardHeaders(),
			Authorization: `Bearer ${generateToken(userId)}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ onboardingStep: ONBOARDING_STEP })
	});
	if (!response.ok) {
		if (response.status === 401) throw error(401, 'Authentication failed');
		throw error(response.status, 'Failed to update user');
	}
}

export const actions = {
	saveAvailability: async (event: RequestEvent) => {
		const { user } = event.locals;
		if (!user) redirect(302, '/sign-in');

		const fd = await event.request.formData();
		const rawDays = fd.get('availableDays');
		const rawDates = fd.get('blockedDates');
		const replaceFrom = String(fd.get('replaceFrom') ?? todayInBusinessTz());
		const replaceTo = String(fd.get('replaceTo') ?? '');

		let availableDays: number[] | null = null;
		let blockedDates: string[] = [];
		try {
			availableDays = rawDays ? JSON.parse(String(rawDays)) : null;
			blockedDates = rawDates ? JSON.parse(String(rawDates)) : [];
		} catch {
			return fail(400, { message: 'Could not read your selection. Please try again.' });
		}

		const res = await fetchAdmin('/api/external/updateCandidateAvailability', {
			method: 'POST',
			token: generateToken(user.id),
			body: {
				availableDays,
				...(replaceTo
					? { blackouts: { from: replaceFrom, to: replaceTo, dates: blockedDates } }
					: {})
			}
		});

		if (!res.ok) {
			logger.error('Failed to save onboarding availability', {
				error: res.error,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: res.error || 'Could not save your availability.' }, event);
			return fail(res.status ?? 500, { message: 'Could not save your availability.' });
		}

		await advanceStep(event, user.id);
		redirect(302, '/onboarding/awaiting-approval');
	},

	skipAvailability: async (event: RequestEvent) => {
		const { user } = event.locals;
		if (!user) redirect(302, '/sign-in');

		// THE SKIP WRITES NOTHING. available_days stays NULL and no blackout rows are
		// created, which preserves the difference between "never answered" and
		// "explicitly chose all seven days" — the distinction the settings page needs
		// to say "you haven't set this yet", and that any future
		// set-your-availability nudge needs to pick its audience.
		await advanceStep(event, user.id);
		redirect(302, '/onboarding/awaiting-approval');
	}
};
