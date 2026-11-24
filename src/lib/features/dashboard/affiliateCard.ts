import type { AffiliateStatus } from './quickLinks';

/** From the admin app's /api/external/affiliate/overview. Earnings are dollars. */
export type AffiliateOverview = NonNullable<AffiliateStatus> & {
	status?: 'PENDING' | 'ACTIVE' | 'ON_HOLD' | 'DENIED';
	connectComplete?: boolean;
	referralUrl?: string | null;
	ratePercent?: string | null;
	activity?: {
		clicks: number;
		referralsActive: number;
		referralsPending: number;
		earningsUnpaid: number;
		earningsPaid: number;
	} | null;
};

export type AffiliateCardState =
	| { kind: 'hidden' }
	| { kind: 'join' }
	| { kind: 'active'; badge: { status: string; label: string }; setupNeeded: boolean }
	| { kind: 'paused'; badge: { status: string; label: string }; message: string };

/** Same states as the practice dashboard's card in the admin app. */
export function affiliateCardState(o: AffiliateOverview | null | undefined): AffiliateCardState {
	if (!o?.programEnabled || !o.eligible) return { kind: 'hidden' };
	if (!o.enrolled) return { kind: 'join' };
	if (o.status === 'ACTIVE') {
		return {
			kind: 'active',
			badge: o.connectComplete ? { status: 'ACTIVE', label: 'Active' } : { status: 'MISSING_GRACE', label: 'Setup incomplete' },
			setupNeeded: !o.connectComplete
		};
	}
	if (o.status === 'PENDING') {
		return { kind: 'paused', badge: { status: 'PENDING', label: 'Awaiting approval' }, message: "Your application is being reviewed. We'll email you once it's approved." };
	}
	return {
		kind: 'paused',
		badge: o.status === 'ON_HOLD' ? { status: 'ON_HOLD', label: 'On hold' } : { status: 'INACTIVE', label: 'Inactive' },
		message: "Your partner account isn't active right now. Commission you've already earned will still be paid."
	};
}

export const money = (dollars: number) => dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
