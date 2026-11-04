import { describe, expect, it } from 'vitest';
import { canCancelShift, shiftMonth, splitShifts } from './split';

const now = new Date('2026-11-04T15:00:00Z');
const at = (dayStart: string, extra = {}) => ({ recurrenceDay: { dayStart, status: 'FILLED', ...extra } });

describe('splitShifts', () => {
	it('sorts upcoming soonest first and past most recent first', () => {
		const { upcoming, past } = splitShifts(
			[at('2026-11-10T12:00:00Z'), at('2026-10-01T12:00:00Z'), at('2026-11-05T12:00:00Z'), at('2026-11-01T12:00:00Z')],
			now
		);
		expect(upcoming.map((s) => s.recurrenceDay.dayStart)).toEqual(['2026-11-05T12:00:00Z', '2026-11-10T12:00:00Z']);
		expect(past.map((s) => s.recurrenceDay.dayStart)).toEqual(['2026-11-01T12:00:00Z', '2026-10-01T12:00:00Z']);
	});
});

describe('canCancelShift', () => {
	it('allows a future shift the professional holds', () => {
		expect(canCancelShift(at('2026-11-05T12:00:00Z'), now)).toBe(true);
	});
	it('refuses a shift that has started', () => {
		expect(canCancelShift(at('2026-11-04T12:00:00Z'), now)).toBe(false);
	});
	it('refuses a shift already cancelled by an admin or client', () => {
		expect(canCancelShift(at('2026-11-05T12:00:00Z', { status: 'CANCELED' }), now)).toBe(false);
		expect(canCancelShift({ ...at('2026-11-05T12:00:00Z'), workday: { cancelledAt: '2026-11-01' } }, now)).toBe(false);
	});
});

describe('shiftMonth', () => {
	it('keeps the calendar month in zones behind UTC', () => {
		expect(shiftMonth({ recurrenceDay: { date: '2026-11-01T00:00:00.000Z' } })).toBe('November 2026');
	});
});
