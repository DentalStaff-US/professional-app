import { describe, expect, it } from 'vitest';
import { wagesBadge } from './hints';

describe('wagesBadge', () => {
	it('shows due and paid on approved timesheets', () => {
		expect(wagesBadge({ status: 'APPROVED', wagesStatus: 'WAGES_DUE' })?.label).toBe('Wages due');
		expect(wagesBadge({ status: 'APPROVED', wagesStatus: 'WAGES_PAID' })?.label).toBe('Wages paid');
	});
	it('shows nothing before approval, after a void, or when never set', () => {
		expect(wagesBadge({ status: 'PENDING', wagesStatus: 'WAGES_DUE' })).toBeNull();
		expect(wagesBadge({ status: 'VOID', wagesStatus: 'WAGES_PAID' })).toBeNull();
		expect(wagesBadge({ status: 'APPROVED', wagesStatus: null })).toBeNull();
		expect(wagesBadge(null)).toBeNull();
	});
});
