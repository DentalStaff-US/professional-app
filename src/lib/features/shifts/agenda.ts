import { dayOfWeek, normalizeDays } from '$lib/components/availability/availability';

export type AgendaDay<T> = { date: string; shifts: T[] };

const dateKey = (shift: any): string => String(shift?.recurrenceDay?.date ?? '').slice(0, 10);
const startOf = (shift: any) =>
	new Date(shift?.recurrenceDay?.dayStart ?? shift?.recurrenceDay?.startTime ?? 0).getTime();

/** Shifts from today onward, grouped by calendar date, soonest first. */
export function groupByDay<T>(shifts: T[], today: string): AgendaDay<T>[] {
	const days = new Map<string, T[]>();
	for (const shift of shifts) {
		const date = dateKey(shift);
		if (!date || date < today) continue;
		days.set(date, [...(days.get(date) ?? []), shift]);
	}
	return [...days.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, list]) => ({ date, shifts: list.sort((a, b) => startOf(a) - startOf(b)) }));
}

/** The Sunday-to-Saturday dates of the week holding `date`, moved by `offset` weeks. */
export function weekOf(date: string, offset = 0): string[] {
	const anchor = new Date(`${date}T00:00:00Z`);
	anchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay() + offset * 7);
	return Array.from({ length: 7 }, (_, i) => {
		const day = new Date(anchor);
		day.setUTCDate(anchor.getUTCDate() + i);
		return day.toISOString().slice(0, 10);
	});
}

/** Every date in the Sunday-to-Saturday grid showing `date`'s month, moved by `offset` months. */
export function monthOf(date: string, offset = 0): { month: string; days: string[] } {
	const first = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
	first.setUTCMonth(first.getUTCMonth() + offset);
	const last = new Date(first);
	last.setUTCMonth(first.getUTCMonth() + 1, 0);
	const start = new Date(first);
	start.setUTCDate(1 - first.getUTCDay());
	const count = first.getUTCDay() + last.getUTCDate();
	const cells = Math.ceil(count / 7) * 7;
	return {
		month: first.toISOString().slice(0, 7),
		days: Array.from({ length: cells }, (_, i) => {
			const day = new Date(start);
			day.setUTCDate(start.getUTCDate() + i);
			return day.toISOString().slice(0, 10);
		})
	};
}

export const shiftDate = dateKey;

/** How many open, claimed and marked-off shifts fall on each date. */
export function dayMarks(shifts: any[]): Map<string, { open: number; claimed: number; off: number }> {
	const marks = new Map<string, { open: number; claimed: number; off: number }>();
	for (const shift of shifts) {
		const date = dateKey(shift);
		if (!date) continue;
		const mark = marks.get(date) ?? { open: 0, claimed: 0, off: 0 };
		if (isClaimed(shift)) mark.claimed += 1;
		else if (shift.blockedByAvailability) mark.off += 1;
		else if (shift.recurrenceDay?.status === 'OPEN') mark.open += 1;
		marks.set(date, mark);
	}
	return marks;
}

/**
 * Which of `days` the professional has said they can't work: dates they marked
 * off, and weekdays outside their weekly pattern. From today on, because that's
 * how far back marked-off dates are loaded and a past day no longer matters.
 */
export function offDays(
	days: string[],
	availability: { availableDays: number[] | null; blockedDates: string[] },
	today: string
): Set<string> {
	const blocked = new Set(availability.blockedDates);
	const weekdays = new Set(normalizeDays(availability.availableDays));
	return new Set(days.filter((date) => date >= today && (blocked.has(date) || !weekdays.has(dayOfWeek(date)))));
}

export const isClaimed = (shift: any): boolean => Boolean(shift?.workday?.id);
