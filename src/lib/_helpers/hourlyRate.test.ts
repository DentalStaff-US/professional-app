import { describe, expect, it } from 'vitest';
import { payRate } from './hourlyRate';

describe('payRate', () => {
	it('uses the timesheet rate when an admin adjusted it', () => {
		expect(payRate({ hourlyRate: 48 }, { adjustedHourlyRate: 52 })).toEqual({ rate: 52, base: 48, adjusted: true });
	});

	it('falls back to the requisition rate', () => {
		const expected = { rate: 48, base: 48, adjusted: false };
		expect(payRate({ hourlyRate: '48' }, { adjustedHourlyRate: null })).toEqual(expected);
		expect(payRate({ hourlyRate: 48 }, {})).toEqual(expected);
		expect(payRate({ hourlyRate: 48 }, null)).toEqual(expected);
		expect(payRate({ hourlyRate: 48 })).toEqual(expected);
	});

	it('treats 0 as a real adjustment, and an unchanged rate as none', () => {
		expect(payRate({ hourlyRate: 48 }, { adjustedHourlyRate: 0 })).toMatchObject({ rate: 0, adjusted: true });
		expect(payRate({ hourlyRate: 48 }, { adjustedHourlyRate: 48 }).adjusted).toBe(false);
	});

	it('handles a missing rate', () => {
		expect(payRate(null)).toEqual({ rate: null, base: null, adjusted: false });
		expect(payRate({ hourlyRate: null }, { adjustedHourlyRate: 52 })).toEqual({ rate: 52, base: null, adjusted: true });
	});
});
