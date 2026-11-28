import { formatInTimeZone } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'America/New_York';

/** A shift's date is a calendar date stored at UTC midnight, so never shift its zone. */
export function formatShiftDate(value: string | Date | null | undefined, long = false): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (isNaN(date.getTime())) return '';
	return date.toLocaleDateString(
		'en-US',
		long
			? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
			: { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }
	);
}

/** Times always show in the practice's time zone, matching the admin app. */
export function formatShiftTime(
	value: string | Date | null | undefined,
	timezone: string | null | undefined
): string {
	if (!value) return '';
	try {
		return formatInTimeZone(
			value instanceof Date ? value : new Date(value),
			timezone || DEFAULT_TIMEZONE,
			'h:mmaaa'
		);
	} catch {
		return '';
	}
}

export function formatTimeRange(
	start: string | Date | null | undefined,
	end: string | Date | null | undefined,
	timezone: string | null | undefined
): string {
	const from = formatShiftTime(start, timezone);
	const to = formatShiftTime(end, timezone);
	return from && to ? `${from}–${to}` : from || to;
}

/** "Today" or "Tomorrow" in the practice's time zone, otherwise null. */
export function relativeShiftDay(
	value: string | Date | null | undefined,
	timezone: string | null | undefined,
	now: Date = new Date()
): string | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (isNaN(date.getTime())) return null;
	const today = formatInTimeZone(now, timezone || DEFAULT_TIMEZONE, 'yyyy-MM-dd');
	const shift = date.toISOString().slice(0, 10);
	const dayMs = 24 * 60 * 60 * 1000;
	const diff = Math.round(
		(new Date(`${shift}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / dayMs
	);
	return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : null;
}

/** "Oct 5 – Oct 11, 2026" from a timesheet's week start. */
export function formatWorkWeek(weekBeginDate: string | null | undefined): string {
	if (!weekBeginDate) return '';
	const start = new Date(weekBeginDate);
	if (isNaN(start.getTime())) return '';
	const end = new Date(start);
	end.setUTCDate(start.getUTCDate() + 6);
	const short = (d: Date) =>
		d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
	return `${short(start)} – ${short(end)}, ${start.getUTCFullYear()}`;
}

export function directionsUrl(address: string): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
