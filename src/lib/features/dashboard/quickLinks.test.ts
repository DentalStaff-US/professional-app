import { describe, expect, it } from 'vitest';
import { affiliateLink } from './quickLinks';

describe('affiliateLink', () => {
	it('goes to the portal once enrolled', () => {
		expect(affiliateLink({ programEnabled: true, eligible: true, enrolled: true })?.href).toBe('/affiliate-portal');
	});
	it('goes to settings when not set up yet', () => {
		expect(affiliateLink({ programEnabled: true, eligible: true, enrolled: false })?.href).toBe('/settings');
	});
	it('stays hidden when the program is off or the account is not eligible', () => {
		expect(affiliateLink({ programEnabled: false, eligible: false, enrolled: false })).toBeNull();
		expect(affiliateLink({ programEnabled: true, eligible: false, enrolled: false })).toBeNull();
	});
	it('stays hidden when the status failed to load', () => {
		expect(affiliateLink(null)).toBeNull();
	});
});
