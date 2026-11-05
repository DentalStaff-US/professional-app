export type InstallState = { visits: number; dismissed: boolean; installed: boolean; hasClaimed: boolean };

/** After the second visit, or the first claimed shift (05 › Add to Home Screen). */
export function shouldOfferInstall({ visits, dismissed, installed, hasClaimed }: InstallState): boolean {
	return !dismissed && !installed && (visits >= 2 || hasClaimed);
}

/** iPhones have no install event, so they get instructions instead. */
export function isIos(userAgent: string): boolean {
	return /iphone|ipad|ipod/i.test(userAgent);
}
