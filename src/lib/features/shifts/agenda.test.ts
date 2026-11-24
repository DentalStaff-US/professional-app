import { describe, expect, it } from 'vitest';
import { dayMarks, groupByDay, isClaimed, monthOf, offDays, weekOf } from './agenda';

const shift = (date: string, dayStart = `${date}T12:00:00Z`) => ({
	recurrenceDay: { date: `${date}T00:00:00.000Z`, dayStart }
});

describe('groupByDay', () => {
	it('groups by date, soonest first, and sorts within a day', () => {
		const days = groupByDay(
			[shift('2026-11-07'), shift('2026-11-05', '2026-11-05T15:00:00Z'), shift('2026-11-05', '2026-11-05T12:00:00Z')],
			'2026-11-04'
		);
		expect(days.map((d) => d.date)).toEqual(['2026-11-05', '2026-11-07']);
		expect(days[0].shifts[0].recurrenceDay.dayStart).toBe('2026-11-05T12:00:00Z');
	});
	it('drops past days but keeps today', () => {
		const days = groupByDay([shift('2026-11-03'), shift('2026-11-04')], '2026-11-04');
		expect(days.map((d) => d.date)).toEqual(['2026-11-04']);
	});
});

describe('weekOf', () => {
	it('runs Sunday to Saturday', () => {
		const week = weekOf('2026-11-04');
		expect(week[0]).toBe('2026-11-01');
		expect(week[6]).toBe('2026-11-07');
	});
	it('moves by whole weeks, across months', () => {
		expect(weekOf('2026-11-04', 4)[0]).toBe('2026-11-29');
		expect(weekOf('2026-11-04', 4)[6]).toBe('2026-12-05');
	});
});

describe('isClaimed', () => {
	it('needs a real workday, since the calendar spreads an empty one onto open shifts', () => {
		expect(isClaimed({ workday: { id: 'w1' } })).toBe(true);
		expect(isClaimed({ workday: {} })).toBe(false);
		expect(isClaimed({})).toBe(false);
	});
});

describe('monthOf', () => {
	it('fills whole weeks around the month', () => {
		const { month, days } = monthOf('2026-11-04');
		expect(month).toBe('2026-11');
		expect(days[0]).toBe('2026-11-01');
		expect(days.at(-1)).toBe('2026-12-05');
		expect(days.length % 7).toBe(0);
	});
	it('starts on the Sunday before the first when the month starts midweek', () => {
		expect(monthOf('2026-12-15').days[0]).toBe('2026-11-29');
	});
	it('moves across years without skipping short months', () => {
		expect(monthOf('2026-12-31', 2).month).toBe('2027-02');
	});
});

describe('dayMarks', () => {
	const on = (extra: object) => ({
		recurrenceDay: { date: '2026-11-05T00:00:00.000Z', status: 'OPEN' },
		...extra
	});
	it('counts each kind of shift separately', () => {
		const mark = dayMarks([
			on({}),
			on({ blockedByAvailability: true }),
			{ recurrenceDay: { date: '2026-11-05T00:00:00.000Z', status: 'FILLED' }, workday: { id: 'w' } }
		]).get('2026-11-05');
		expect(mark).toEqual({ open: 1, claimed: 1, off: 1 });
	});
});

describe('offDays', () => {
	const week = weekOf('2026-11-04'); // Sun Nov 1 to Sat Nov 7
	it('marks blocked dates and weekdays outside the weekly pattern', () => {
		const off = offDays(week, { availableDays: [1, 2, 3, 4, 5], blockedDates: ['2026-11-05'] }, '2026-11-01');
		expect([...off]).toEqual(['2026-11-01', '2026-11-05', '2026-11-07']);
	});
	it('treats no weekly pattern as available every day', () => {
		expect([...offDays(week, { availableDays: null, blockedDates: ['2026-11-06'] }, '2026-11-01')]).toEqual(['2026-11-06']);
	});
	it('leaves past days alone', () => {
		expect([...offDays(week, { availableDays: [1, 2, 3, 4, 5], blockedDates: ['2026-11-02'] }, '2026-11-04')]).toEqual(['2026-11-07']);
	});
});
