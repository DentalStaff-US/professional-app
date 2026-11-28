export type AffiliateStatus = {
	programEnabled?: boolean;
	eligible?: boolean;
	enrolled?: boolean;
} | null | undefined;

/**
 * The partner program's quick link, or null to hide it. Same rule as Settings: a
 * pending, inactive or denied professional never learns the program exists. Portal
 * links go through /affiliate-portal, whose one-time token signs them in on arrival.
 */
export function affiliateLink(status: AffiliateStatus) {
	if (!status?.programEnabled || !status.eligible) return null;
	return status.enrolled
		? { href: '/affiliate-portal', label: 'Partner portal' }
		: { href: '/settings', label: 'Refer and earn' };
}
