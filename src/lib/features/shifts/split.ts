type WithStart = { recurrenceDay?: { dayStart?: string | Date | null } | null };

const startOf = (shift: WithStart) => new Date(shift.recurrenceDay?.dayStart ?? 0).getTime();

/** Upcoming soonest first, past most recent first. */
export function splitShifts<T extends WithStart>(shifts: T[], now: Date = new Date()) {
	const time = now.getTime();
	return {
		upcoming: shifts.filter((s) => startOf(s) >= time).sort((a, b) => startOf(a) - startOf(b)),
		past: shifts.filter((s) => startOf(s) < time).sort((a, b) => startOf(b) - startOf(a))
	};
}

/**
 * A candidate can cancel only a future shift they still hold. A day flipped to
 * CANCELED, or a workday with cancelledAt set, means an admin or client already
 * cancelled it, and another cancellation would skew the penalty-tracking data.
 */
export function canCancelShift(shift: any, now: Date = new Date()): boolean {
	if (!shift?.recurrenceDay?.dayStart) return false;
	if (new Date(shift.recurrenceDay.dayStart) <= now) return false;
	if (shift.recurrenceDay.status !== 'FILLED') return false;
	return !shift.workday?.cancelledAt;
}

/** "November 2026" in the practice's calendar, from a shift's UTC-midnight date. */
export function shiftMonth(shift: { recurrenceDay?: { date?: string | Date | null } | null }): string {
	const value = shift.recurrenceDay?.date;
	if (!value) return '';
	return new Date(value).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}
