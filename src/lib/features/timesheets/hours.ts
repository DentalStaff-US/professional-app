import { formatInTimeZone } from 'date-fns-tz';

export type TimeEntry = {
	startTime: string;
	endTime: string;
	lunchStartTime: string;
	lunchEndTime: string;
	hours: number;
	workdayId: string;
};

const WEEKLY_REGULAR_HOURS = 40;

const toMinutes = (time: string) => {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export function lunchHours(start: string, end: string): number {
	if (!start || !end) return 0;
	return Math.max(0, round2((toMinutes(end) - toMinutes(start)) / 60));
}

/** Hours worked, with lunch taken out. Never negative, so a typo can't reduce the week. */
export function workedHours(start: string, end: string, lunchStart = '', lunchEnd = ''): number {
	if (!start || !end) return 0;
	return Math.max(0, round2((toMinutes(end) - toMinutes(start)) / 60 - lunchHours(lunchStart, lunchEnd)));
}

/**
 * Overtime is per WEEK. When a week is split across timesheets, some of the 40
 * regular hours may already be used on another approved one (`priorWeekHours`), so
 * this sheet can be all overtime even though it's under 40 by itself.
 */
export function splitOvertime(total: number, priorWeekHours = 0) {
	const regular = Math.min(total, Math.max(0, WEEKLY_REGULAR_HOURS - priorWeekHours));
	return { regular, overtime: Math.max(0, total - regular) };
}

/**
 * What's wrong with a day, or null. Blocks submitting but not saving a draft, since
 * professionals save partial days as the shift goes on. Partial rows matter because
 * the submit action drops any day with no hours, which would silently lose them.
 */
export function entryProblem(entry: TimeEntry | undefined): string | null {
	if (!entry) return null;
	const { startTime, endTime, lunchStartTime, lunchEndTime } = entry;
	if (!startTime && !endTime && !lunchStartTime && !lunchEndTime) return null;
	if (!startTime || !endTime) return 'Add both a start and an end time.';
	if (toMinutes(endTime) <= toMinutes(startTime)) return 'The end time needs to be after the start time.';
	if (Boolean(lunchStartTime) !== Boolean(lunchEndTime)) return 'Add both lunch times, or leave both empty.';
	if (lunchStartTime && lunchEndTime) {
		const lunchStart = toMinutes(lunchStartTime);
		const lunchEnd = toMinutes(lunchEndTime);
		if (lunchEnd <= lunchStart) return 'Lunch needs to end after it starts.';
		if (lunchStart < toMinutes(startTime) || lunchEnd > toMinutes(endTime)) {
			return 'Lunch needs to fall within your start and end times.';
		}
	}
	return null;
}

/** Submitting opens once the last shift on this timesheet has started. */
export function lastShiftStarted(workdays: any[], now: Date = new Date()): boolean {
	const starts = workdays
		.map((workday) => workday?.recurrenceDay?.dayStart)
		.filter(Boolean)
		.map((start) => new Date(start).getTime());
	return starts.length === 0 || now.getTime() >= Math.max(...starts);
}

/**
 * Entries for each scheduled day, pre-filled from saved hours. Saved times are UTC,
 * shown in the practice's time zone. Saved rows for days no longer on the timesheet
 * are ignored. Each entry carries its workday id, which the API requires per day.
 */
export function buildEntries(workdays: any[], hoursRaw: any[] | null | undefined, timezone: string) {
	const entries: Record<string, TimeEntry> = {};
	for (const workday of workdays) {
		const date = workday?.recurrenceDay?.date;
		if (!date) continue;
		entries[date] = {
			startTime: '',
			endTime: '',
			lunchStartTime: '',
			lunchEndTime: '',
			hours: 0,
			workdayId: workday?.workday?.id ?? ''
		};
	}
	const toLocal = (iso: string | null | undefined) =>
		iso ? formatInTimeZone(new Date(iso), timezone, 'HH:mm') : '';
	for (const saved of Array.isArray(hoursRaw) ? hoursRaw : []) {
		const entry = entries[saved.date];
		if (!entry) continue;
		entries[saved.date] = {
			...entry,
			startTime: toLocal(saved.startTime),
			endTime: toLocal(saved.endTime),
			lunchStartTime: toLocal(saved.lunchStartTime),
			lunchEndTime: toLocal(saved.lunchEndTime),
			hours: saved.hours || 0
		};
	}
	return entries;
}
