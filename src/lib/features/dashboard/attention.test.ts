import { describe, expect, it } from 'vitest';
import { needsAttention } from './attention';

describe('needsAttention', () => {
	it('keeps only draft and discrepancy timesheets', () => {
		const rows = ['DRAFT', 'PENDING', 'APPROVED', 'DISCREPANCY', 'REJECTED', 'VOID'].map((status) => ({ timesheet: { status } }));
		expect(needsAttention(rows).map((r) => r.timesheet.status)).toEqual(['DRAFT', 'DISCREPANCY']);
	});
	it('ignores rows without a status', () => {
		expect(needsAttention([{ timesheet: null }, {}])).toEqual([]);
	});
});
