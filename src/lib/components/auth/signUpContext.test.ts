import { describe, expect, it } from 'vitest';
import { jobHeadline, passwordStrength } from './signUpContext';

describe('jobHeadline', () => {
	it('offers to claim a temp shift', () => {
		expect(jobHeadline({ type: 'temp', discipline: { name: 'Dental Hygienist' }, city: 'Tampa' })).toBe(
			'Sign up to claim Temp Dental Hygienist in Tampa'
		);
	});
	it('offers to apply for a permanent job', () => {
		expect(jobHeadline({ type: 'perm', discipline: { name: 'Office Manager' }, city: null })).toBe(
			'Sign up to apply for Office Manager'
		);
	});
	it('falls back when the job has no name', () => {
		expect(jobHeadline({ type: 'temp' })).toBeNull();
	});
});

describe('passwordStrength', () => {
	it('states the one real rule', () => {
		expect(passwordStrength('abc')).toMatch(/at least 6/);
	});
	it('accepts anything meeting that rule', () => {
		expect(passwordStrength('abcdef')).toMatch(/^Good/);
	});
	it('calls long or varied passwords strong', () => {
		expect(passwordStrength('correcthorsebattery')).toMatch(/^Strong/);
		expect(passwordStrength('Ab1!efgh')).toMatch(/^Strong/);
	});
});
