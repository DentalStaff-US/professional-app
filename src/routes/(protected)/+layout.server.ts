/**
 * Protected route guard. Runs after the session+verified checks in
 * hooks.server.ts; this layer adds:
 *
 *   "user is logged in but has no candidate_profiles row" → redirect to
 *   /onboarding instead of letting the request hit a downstream API that
 *   would 404 with `Candidate profile not found` and bubble up as a 500.
 *
 * The drift can happen when a user row exists but the profile row was never
 * created (e.g. a half-completed onboarding step, a manual SQL edit that
 * flipped completed_onboarding=true without inserting the profile, or a
 * partially-applied bulk import). Without this guard, every protected page
 * 500s and the user has no path forward.
 *
 * The check is a single indexed lookup on candidate_profiles.user_id and
 * runs once per layout load (not per child route), so the cost is tiny.
 */

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import db from '$lib/server/database/drizzle';
import { sql } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user;
	// Surfaced so the layout can show an "admin is impersonating you" banner.
	const impersonating = Boolean(event.locals.session?.impersonatedBy);
	if (!user) return { impersonating };

	// Role enforcement happens in hooks.server.ts (it invalidates the session
	// and bounces non-CANDIDATE users to the admin app). By the time we get
	// here, user.role is guaranteed to be CANDIDATE.

	// Don't run the missing-profile redirect inside the onboarding flow
	// itself — that's where we send users with no profile, and the
	// setupCandidateProfile action handles the no-profile case explicitly.
	const routeId = event.route.id ?? '';
	if (routeId.startsWith('/(protected)/onboarding')) return { impersonating };

	const result = await db.execute(
		sql`SELECT candidate_status FROM candidate_profiles WHERE user_id = ${user.id} LIMIT 1`
	);

	if (result.rows.length === 0) {
		redirect(302, '/onboarding');
	}

	// Surface the candidate's account status so the layout can render a banner
	// and child pages can gate interactions. Only ACTIVE candidates may see /
	// apply to requisitions; PENDING/INACTIVE/DENIED are blocked server-side in
	// the admin external API and shown a banner here.
	const candidateStatus = (result.rows[0] as { candidate_status: string }).candidate_status;

	return { candidateStatus, impersonating };
};
