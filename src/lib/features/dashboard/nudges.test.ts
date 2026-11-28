import { describe, expect, it } from 'vitest';
import { homeNudges } from './nudges';

const today = '2026-11-04';
const complete = { completeAddress: '1 Main St', cellPhone: '+15555555555' };
const license = (effectiveLicenseExpiry: string | null) => ({
	disciplineId: 'd1',
	name: 'EFDA',
	requiresLicense: true,
	effectiveLicenseExpiry
});

describe('homeNudges', () => {
	it('stays quiet when nothing needs doing', () => {
		expect(homeNudges({ profile: complete, disciplines: [license('2029-01-01')], today })).toEqual([]);
	});
	it('warns about a credential expiring within 60 days', () => {
		const [nudge] = homeNudges({ profile: complete, disciplines: [license('2026-12-01')], today });
		expect(nudge.title).toBe('Your EFDA license or registration expires soon');
	});
	it('leaves expired and missing credentials to the certificate banner', () => {
		expect(homeNudges({ profile: complete, disciplines: [license('2020-01-01'), license(null)], today })).toEqual([]);
	});
	it('ignores an expiry on something not required', () => {
		const discipline = { disciplineId: 'd1', name: 'RDH', requiresLicense: false, effectiveLicenseExpiry: '2026-12-01' };
		expect(homeNudges({ profile: complete, disciplines: [discipline], today })).toEqual([]);
	});
	it('says exactly what the profile lacks', () => {
		const [nudge] = homeNudges({ profile: { completeAddress: null, cellPhone: '1' }, today });
		expect(nudge.text).toContain('home address so');
	});
	it('does not nag when the profile failed to load', () => {
		expect(homeNudges({ profile: null, today })).toEqual([]);
	});
});
