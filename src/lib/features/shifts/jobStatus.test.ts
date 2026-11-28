import { describe, expect, it } from 'vitest';
import { applyButtonState, jobStatusLabel } from './jobStatus';

describe('jobStatusLabel', () => {
	it('shows nothing while the job is open', () => {
		expect(jobStatusLabel('OPEN')).toBeNull();
		expect(jobStatusLabel(null)).toBeNull();
	});
	it('hides billing states behind "filled"', () => {
		expect(jobStatusLabel('PAYMENT_REQUIRED')?.label).toBe('Position filled');
		expect(jobStatusLabel('PAYMENT_RECEIVED')?.label).toBe('Position filled');
	});
	it('names cancelled and closed jobs', () => {
		expect(jobStatusLabel('CANCELED')?.label).toBe('Cancelled');
		expect(jobStatusLabel('CLOSED')?.label).toBe('Closed');
	});
});

describe('applyButtonState', () => {
	it('lets them apply when the job allows it', () => {
		expect(applyButtonState(null, true).disabled).toBe(false);
	});
	it("puts the applicant's own status first", () => {
		expect(applyButtonState('PENDING', true)).toEqual({ label: 'Application pending', disabled: true });
		expect(applyButtonState('DENIED', false).disabled).toBe(true);
	});
	it('refuses when the job is not accepting applications', () => {
		expect(applyButtonState(null, false)).toEqual({ label: 'Not accepting applications', disabled: true });
	});
});
