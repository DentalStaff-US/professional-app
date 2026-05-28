import db from '$lib/server/database/drizzle';
import { sql } from 'drizzle-orm';

// Candidate account-status helper for the candidate app. Only ACTIVE candidates
// may apply to perm reqs or claim temp shifts; PENDING/INACTIVE/DENIED are
// blocked. The admin external API enforces this too (defense in depth) — these
// helpers let candidate-app actions short-circuit with a clear message before
// making the cross-app request.

export async function getCandidateStatus(userId: string | undefined): Promise<string | null> {
	if (!userId) return null;
	const result = await db.execute(
		sql`SELECT candidate_status FROM candidate_profiles WHERE user_id = ${userId} LIMIT 1`
	);
	if (result.rows.length === 0) return null;
	return (result.rows[0] as { candidate_status: string }).candidate_status;
}

/** Human-readable reason when a candidate isn't allowed to interact. */
export function inactiveAccountMessage(status: string | null): string {
	if (status === 'PENDING') return 'Your account is pending approval. You cannot do this yet.';
	if (status === 'DENIED') return 'Your account was denied. Please contact support.';
	return 'Your account is inactive. Please contact support to reactivate.';
}
