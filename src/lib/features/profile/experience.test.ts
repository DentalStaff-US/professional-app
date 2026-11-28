import { describe, expect, it } from 'vitest';
import { rowErrors, rowIsBlank, sortLevels, toEntries, type ExperienceRow } from './experience';

const row = (over: Partial<ExperienceRow> = {}): ExperienceRow => ({
	key: 1,
	disciplineId: 'd1',
	experienceLevelId: 'l1',
	min: 30,
	max: 40,
	...over
});

describe('rowErrors', () => {
	it('accepts a complete row, and blank rates', () => {
		expect(rowErrors(row())).toEqual({});
		expect(rowErrors(row({ min: '', max: null }))).toEqual({});
	});
	it('asks for the discipline and level', () => {
		expect(rowErrors(row({ disciplineId: '', experienceLevelId: '' }))).toMatchObject({
			discipline: expect.any(String),
			level: expect.any(String)
		});
	});
	it('refuses a maximum below the minimum', () => {
		expect(rowErrors(row({ min: 40, max: 30 })).rate).toMatch(/lower/);
	});
	it('refuses cents and negatives, which the server rejects out of sight', () => {
		expect(rowErrors(row({ min: 22.5 })).rate).toMatch(/whole/);
		expect(rowErrors(row({ min: -1 })).rate).toMatch(/whole/);
	});
});

describe('toEntries', () => {
	it('drops untouched rows and turns blank rates into 0', () => {
		const blank = row({ disciplineId: '', experienceLevelId: '', min: '', max: '' });
		expect(rowIsBlank(blank)).toBe(true);
		expect(toEntries([blank, row({ min: '', max: '45' })])).toEqual([
			{ disciplineId: 'd1', experienceLevelId: 'l1', preferredHourlyMin: 0, preferredHourlyMax: 45 }
		]);
	});
});

describe('sortLevels', () => {
	it('orders by years, including mixed case and unknown labels', () => {
		const sorted = sortLevels([{ value: '10+ years' }, { value: 'Other' }, { value: '2-5 Years' }, { value: '0-2 Years' }]);
		expect(sorted.map((level) => level.value)).toEqual(['0-2 Years', '2-5 Years', '10+ years', 'Other']);
	});
});
