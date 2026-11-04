import { describe, expect, it } from 'vitest';
import {
	buildEntries,
	entryProblem,
	lastShiftStarted,
	lunchHours,
	splitOvertime,
	workedHours,
	type TimeEntry
} from './hours';

const entry = (over: Partial<TimeEntry> = {}): TimeEntry => ({
	startTime: '',
	endTime: '',
	lunchStartTime: '',
	lunchEndTime: '',
	hours: 0,
	workdayId: 'w',
	...over
});

describe('workedHours', () => {
	it('takes lunch out', () => {
		expect(workedHours('08:00', '17:00', '12:00', '12:30')).toBe(8.5);
	});
	it('rounds to two decimals', () => {
		expect(workedHours('08:00', '08:20')).toBe(0.33);
	});
	it('is zero until both times are in', () => {
		expect(workedHours('08:00', '')).toBe(0);
	});
	it('never goes negative', () => {
		expect(workedHours('17:00', '08:00')).toBe(0);
		expect(workedHours('08:00', '09:00', '09:00', '11:00')).toBe(0);
	});
});

describe('lunchHours', () => {
	it('needs both times', () => {
		expect(lunchHours('12:00', '')).toBe(0);
		expect(lunchHours('12:00', '13:00')).toBe(1);
	});
});

describe('splitOvertime', () => {
	it('keeps the first 40 hours regular', () => {
		expect(splitOvertime(45)).toEqual({ regular: 40, overtime: 5 });
		expect(splitOvertime(38)).toEqual({ regular: 38, overtime: 0 });
	});
	it('counts hours already used on another timesheet that week', () => {
		expect(splitOvertime(8, 36)).toEqual({ regular: 4, overtime: 4 });
		expect(splitOvertime(8, 44)).toEqual({ regular: 0, overtime: 8 });
	});
});

describe('entryProblem', () => {
	it('accepts an empty day and a complete day', () => {
		expect(entryProblem(entry())).toBeNull();
		expect(entryProblem(entry({ startTime: '08:00', endTime: '17:00' }))).toBeNull();
		expect(
			entryProblem(entry({ startTime: '08:00', endTime: '17:00', lunchStartTime: '12:00', lunchEndTime: '12:30' }))
		).toBeNull();
	});
	it('flags a half-entered day, which submitting would otherwise drop', () => {
		expect(entryProblem(entry({ startTime: '08:00' }))).toMatch(/start and an end/);
	});
	it('flags times in the wrong order', () => {
		expect(entryProblem(entry({ startTime: '17:00', endTime: '08:00' }))).toMatch(/after the start/);
	});
	it('flags half-entered lunch, which would otherwise deduct nothing', () => {
		expect(entryProblem(entry({ startTime: '08:00', endTime: '17:00', lunchStartTime: '12:00' }))).toMatch(/both lunch/);
	});
	it('flags lunch outside the shift', () => {
		expect(
			entryProblem(entry({ startTime: '08:00', endTime: '12:00', lunchStartTime: '12:00', lunchEndTime: '12:30' }))
		).toMatch(/within/);
	});
});

describe('lastShiftStarted', () => {
	const shift = (dayStart: string) => ({ recurrenceDay: { dayStart } });
	const now = new Date('2026-11-04T15:00:00Z');
	it('waits for the latest shift, in any order', () => {
		expect(lastShiftStarted([shift('2026-11-05T12:00:00Z'), shift('2026-11-03T12:00:00Z')], now)).toBe(false);
		expect(lastShiftStarted([shift('2026-11-04T12:00:00Z'), shift('2026-11-03T12:00:00Z')], now)).toBe(true);
	});
	it('is open when there are no shifts to wait for', () => {
		expect(lastShiftStarted([], now)).toBe(true);
	});
});

describe('buildEntries', () => {
	const workdays = [{ workday: { id: 'w1' }, recurrenceDay: { date: '2026-11-03' } }];
	it('starts each scheduled day empty, with its workday id', () => {
		expect(buildEntries(workdays, null, 'America/New_York')['2026-11-03']).toEqual(entry({ workdayId: 'w1' }));
	});
	it("shows saved times in the practice's zone and keeps saved hours", () => {
		const saved = [{ date: '2026-11-03', startTime: '2026-11-03T13:00:00Z', endTime: '2026-11-03T22:00:00Z', hours: 8.5 }];
		const result = buildEntries(workdays, saved, 'America/New_York')['2026-11-03'];
		expect(result.startTime).toBe('08:00');
		expect(result.endTime).toBe('17:00');
		expect(result.hours).toBe(8.5);
		expect(result.workdayId).toBe('w1');
	});
	it('ignores saved days no longer on the timesheet', () => {
		const saved = [{ date: '2026-11-04', startTime: '2026-11-04T13:00:00Z', hours: 8 }];
		expect(Object.keys(buildEntries(workdays, saved, 'America/New_York'))).toEqual(['2026-11-03']);
	});
});
