import { describe, expect, it } from 'vitest';
import {
	directionsUrl,
	formatShiftDate,
	formatTimeRange,
	formatWorkWeek,
	relativeShiftDay
} from './format';

describe('formatShiftDate', () => {
	it('keeps the calendar date in zones behind UTC', () => {
		expect(formatShiftDate('2026-11-05T00:00:00.000Z')).toBe('Thu, Nov 5');
	});
	it('returns nothing for missing or invalid dates', () => {
		expect(formatShiftDate(null)).toBe('');
		expect(formatShiftDate('nope')).toBe('');
	});
});

describe('formatTimeRange', () => {
	it("uses the practice's time zone", () => {
		expect(
			formatTimeRange('2026-11-05T12:30:00Z', '2026-11-05T21:00:00Z', 'America/New_York')
		).toBe('7:30am–4:00pm');
		expect(
			formatTimeRange('2026-11-05T15:30:00Z', '2026-11-06T00:00:00Z', 'America/Los_Angeles')
		).toBe('7:30am–4:00pm');
	});
	it('falls back to New York when no zone is set', () => {
		expect(formatTimeRange('2026-11-05T12:30:00Z', null, null)).toBe('7:30am');
	});
});

describe('relativeShiftDay', () => {
	const tz = 'America/New_York';
	const now = new Date('2026-11-05T02:00:00Z'); // Nov 4, 9pm in New York

	it("compares against today in the practice's zone", () => {
		expect(relativeShiftDay('2026-11-04T00:00:00Z', tz, now)).toBe('Today');
		expect(relativeShiftDay('2026-11-05T00:00:00Z', tz, now)).toBe('Tomorrow');
		expect(relativeShiftDay('2026-11-06T00:00:00Z', tz, now)).toBeNull();
	});
});

describe('formatWorkWeek', () => {
	it('spans seven days', () => {
		expect(formatWorkWeek('2026-10-05')).toBe('Oct 5 – Oct 11, 2026');
	});
});

describe('directionsUrl', () => {
	it('encodes the address', () => {
		expect(directionsUrl('1 Main St, Tampa')).toContain('1%20Main%20St%2C%20Tampa');
	});
});
