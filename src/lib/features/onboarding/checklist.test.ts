import { describe, expect, it } from 'vitest';
import { buildChecklist } from './checklist';
import { currentStepIndex } from './steps';

const today = '2026-11-04';
const complete = {
	profile: { completeAddress: '1 Main St', cellPhone: '+15555555555' },
	disciplines: [{ disciplineId: 'd1', name: 'Dental Assistant' }],
	documents: [{ type: 'RESUME' }, { type: 'OTHER' }],
	hasResume: true,
	today
};
const byId = (input: Parameters<typeof buildChecklist>[0], id: string) => buildChecklist(input).find((item) => item.id === id);

describe('buildChecklist', () => {
	it('shows done steps and ends with the team review', () => {
		const items = buildChecklist(complete);
		expect(items.filter((item) => item.state === 'missing')).toEqual([]);
		expect(items.at(-1)).toMatchObject({ id: 'review', state: 'review' });
	});
	it('reports exactly what the profile lacks', () => {
		const item = byId({ ...complete, profile: { completeAddress: null, cellPhone: '1' } }, 'profile');
		expect(item).toMatchObject({ state: 'missing', detail: 'Add your address' });
	});
	it('does not claim a resume or experience that is not there', () => {
		const input = { ...complete, hasResume: false, disciplines: [] };
		expect(byId(input, 'resume')?.state).toBe('missing');
		expect(byId(input, 'experience')?.state).toBe('missing');
	});
	it('lists a required license as missing, with somewhere to add it', () => {
		const input = { ...complete, disciplines: [{ disciplineId: 'd1', name: 'EFDA', requiresLicense: true }] };
		expect(byId(input, 'license-d1')).toMatchObject({ state: 'missing', href: '/settings/documents' });
	});
	it('keeps a license and a certification apart', () => {
		const input = {
			...complete,
			disciplines: [{ disciplineId: 'd1', name: 'EFDA', requiresLicense: true, requiresCert: true, effectiveCertExpiry: '2029-01-01' }]
		};
		expect(byId(input, 'cert-d1')?.state).toBe('done');
		expect(byId(input, 'license-d1')?.state).toBe('missing');
	});
	it('says when a credential has expired', () => {
		const input = { ...complete, disciplines: [{ disciplineId: 'd1', name: 'RDH', requiresLicense: true, effectiveLicenseExpiry: '2020-01-01' }] };
		expect(byId(input, 'license-d1')).toMatchObject({ state: 'missing', detail: 'The one on file has expired' });
	});
	it('marks documents optional when nothing is required', () => {
		expect(byId({ ...complete, documents: [] }, 'documents')?.state).toBe('optional');
	});
});

describe('currentStepIndex', () => {
	it('finds each step, ignoring a trailing slash', () => {
		expect(currentStepIndex('/onboarding')).toBe(0);
		expect(currentStepIndex('/onboarding/resume/')).toBe(2);
	});
	it('has no step once they are awaiting approval', () => {
		expect(currentStepIndex('/onboarding/awaiting-approval')).toBe(-1);
	});
});
