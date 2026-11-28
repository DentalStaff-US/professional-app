import { describe, expect, it } from 'vitest';
import { affiliateCardState, money } from './affiliateCard';

const base = { programEnabled: true, eligible: true, enrolled: true, status: 'ACTIVE' as const, connectComplete: true };

describe('affiliateCardState', () => {
	it('hides when the program is off, not eligible, or it failed to load', () => {
		expect(affiliateCardState({ ...base, programEnabled: false }).kind).toBe('hidden');
		expect(affiliateCardState({ ...base, eligible: false }).kind).toBe('hidden');
		expect(affiliateCardState(null).kind).toBe('hidden');
	});
	it('invites someone who has not joined', () => {
		expect(affiliateCardState({ ...base, enrolled: false }).kind).toBe('join');
	});
	it('flags unfinished payout setup', () => {
		expect(affiliateCardState({ ...base, connectComplete: false })).toMatchObject({ kind: 'active', setupNeeded: true });
		expect(affiliateCardState(base)).toMatchObject({ kind: 'active', setupNeeded: false });
	});
	it('explains pending, held and denied accounts', () => {
		for (const status of ['PENDING', 'ON_HOLD', 'DENIED'] as const) expect(affiliateCardState({ ...base, status }).kind).toBe('paused');
	});
});

describe('money', () => {
	it('always shows cents', () => expect(money(182.4)).toBe('$182.40'));
});
