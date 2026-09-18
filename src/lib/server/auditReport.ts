import { fetchAdmin } from '$lib/server/fetchAdmin';
import { generateToken } from '$lib/server/utils';
import { logger } from '$lib/server/logger';

/**
 * Report a session event to the platform ledger, which lives in the admin app.
 * This app runs its own Better Auth instance against the shared DB, so its
 * sign-ins/outs never pass through the admin app's session hooks — we tell it.
 *
 * Fire-and-forget: a ledger hiccup must never slow down or fail a sign-in.
 */
export function reportSessionEvent(
	userId: string,
	action: 'SIGN_IN' | 'SIGN_OUT',
	metadata: Record<string, unknown> = {}
): void {
	let token: string;
	try {
		token = generateToken(userId);
	} catch (err) {
		logger.error('auditReport: could not mint token', { error: err, distinctId: userId });
		return;
	}
	void fetchAdmin('/api/external/audit/session', {
		method: 'POST',
		token,
		body: { action, metadata },
		timeoutMs: 5_000
	}).then((res) => {
		if (!res.ok) {
			logger.warn('auditReport: ledger rejected session event', {
				action,
				distinctId: userId,
				error: res.error
			});
		}
	});
}
