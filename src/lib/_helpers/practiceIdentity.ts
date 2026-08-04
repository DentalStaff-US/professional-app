/**
 * Is this listing's practice identity withheld?
 *
 * The admin API sets `identityLocked` explicitly (see
 * `$lib/server/privacy/clientIdentity` over there), and that flag is the
 * authority when present. The fallback matters because the two apps deploy
 * independently: when the admin app ships masking before this app ships the
 * locked UI, rows arrive with every identity field nulled and no flag — which
 * is how a card ends up rendering the literal string "null". Treating a row
 * with no practice name as locked makes that skew degrade into the correct
 * locked panel instead of leaking template internals at the user.
 */
export function isPracticeLocked(row: any): boolean {
	if (row?.identityLocked === true) return true;
	if (row?.identityLocked === false) return false;

	const company = row?.company ?? {};
	return !(company.name ?? company.companyName);
}
