import { describe, expect, it } from 'vitest';
import { isIos, shouldOfferInstall } from './install';

const base = { visits: 1, dismissed: false, installed: false, hasClaimed: false };

describe('shouldOfferInstall', () => {
	it('waits for a second visit or a claimed shift', () => {
		expect(shouldOfferInstall(base)).toBe(false);
		expect(shouldOfferInstall({ ...base, visits: 2 })).toBe(true);
		expect(shouldOfferInstall({ ...base, hasClaimed: true })).toBe(true);
	});
	it('never returns once dismissed or installed', () => {
		expect(shouldOfferInstall({ ...base, visits: 5, dismissed: true })).toBe(false);
		expect(shouldOfferInstall({ ...base, visits: 5, installed: true })).toBe(false);
	});
});

describe('isIos', () => {
	it('tells iPhones from Android', () => {
		expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
		expect(isIos('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
	});
});
