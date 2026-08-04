import { formatTimestampForDisplay } from '$lib/_helpers/UTCTimezoneUtils';
import { format, parseISO } from 'date-fns';

export type CalendarEvent = {
	start: Date;
	end: Date;
	title: string;
	resourceIds?: string[];
	resourceId?: string;
	id: string;
	extendedProps: Record<string, any>;
};

export function createEvents() {
	const days = [];
	for (let i = 0; i < 7; ++i) {
		const day = new Date();
		const diff = i - day.getDay();
		day.setDate(day.getDate() + diff);
		days[i] = day.getFullYear() + '-' + _pad(day.getMonth() + 1) + '-' + _pad(day.getDate());
	}

	return [
		{ start: days[0] + ' 00:00', end: days[0] + ' 09:00', resourceId: 1, display: 'background' },
		{ start: days[1] + ' 12:00', end: days[1] + ' 14:00', resourceId: 2, display: 'background' },
		{ start: days[2] + ' 17:00', end: days[2] + ' 24:00', resourceId: 1, display: 'background' },
		{
			start: days[0] + ' 10:00',
			end: days[0] + ' 14:00',
			resourceId: 1,
			title: 'The calendar can display background and regular events',
			color: '#FE6B64'
		},
		{
			start: days[1] + ' 16:00',
			end: days[2] + ' 08:00',
			resourceId: 2,
			title: 'An event may span to another day',
			color: '#B29DD9'
		},
		{
			start: days[2] + ' 09:00',
			end: days[2] + ' 13:00',
			resourceId: 2,
			title: 'Events can be assigned to resources and the calendar has the resources view built-in',
			color: '#779ECB'
		},
		{
			start: days[3] + ' 14:00',
			end: days[3] + ' 20:00',
			resourceId: 1,
			title: '',
			color: '#FE6B64'
		},
		{
			start: days[3] + ' 15:00',
			end: days[3] + ' 18:00',
			resourceId: 1,
			title: 'Overlapping events are positioned properly',
			color: '#779ECB'
		},
		{
			start: days[5] + ' 10:00',
			end: days[5] + ' 16:00',
			resourceId: 2,
			title: { html: 'You have complete control over the <i><b>display</b></i> of events…' },
			color: '#779ECB'
		},
		{
			start: days[5] + ' 14:00',
			end: days[5] + ' 19:00',
			resourceId: 2,
			title: '…and you can drag and drop the events!',
			color: '#FE6B64'
		},
		{
			start: days[5] + ' 18:00',
			end: days[5] + ' 21:00',
			resourceId: 2,
			title: '',
			color: '#B29DD9'
		},
		{
			start: days[1],
			end: days[3],
			resourceId: 1,
			title: 'All-day events can be displayed at the top',
			color: '#B29DD9',
			allDay: true
		}
	];
}

export function _pad(num: number) {
	const norm = Math.floor(Math.abs(num));
	return (norm < 10 ? '0' : '') + norm;
}

const requisitionStatusColorEnum = {
	OPEN: '#3b82f6',
	FILLED: '#31c48d',
	UNFULFILLED: '#ff8a4c',
	CANCELED: '#f05252'
} as const;

export function convertRecurrenceDayToEvent(data: {
	// Recurrence-day shape varies by source endpoint:
	//   - getTempRequisitionsForCandidate aliases to startTime/endTime
	//   - getUpcomingWorkdaysForCandidate spreads raw dayStart/dayEnd
	// Accept either; the factory normalizes to the raw `dayStart`/`dayEnd`
	// names in extendedProps so the dialog / consumers don't have to branch.
	recurrenceDay: {
		id?: any;
		date?: any;
		startTime?: any;
		endTime?: any;
		dayStart?: any;
		dayEnd?: any;
		status?: any;
	};
	requisition: {
		id: any;
		title?: any;
		disciplineName?: string | null;
		hourlyRate?: number;
		referenceTimezone?: string | null;
	};
	workday: any | null;
	company: { id: string | null; name?: string | null; logo?: string | null };
	location: {
		completeAddress?: string | null;
		city?: string | null;
		state?: string | null;
		distanceMiles?: number | null;
	};
	// Set by the admin API when the practice's identity is withheld because the
	// candidate doesn't hold this shift. Carried into extendedProps so the
	// event dialog can render the locked panel instead of empty fields.
	identityLocked?: boolean;
}) {
	const {
		recurrenceDay: { id: recurrenceDayId, status },
		requisition,
		workday,
		company,
		location
	} = data;

	// Normalize to raw column names. `dayStart`/`dayEnd` is the canonical
	// shape (admin app + workdays endpoint); `startTime`/`endTime` is the
	// alias used by the temp-listing endpoints. Prefer raw, fall back to
	// alias.
	const dayStart = data.recurrenceDay.dayStart ?? data.recurrenceDay.startTime;
	const dayEnd = data.recurrenceDay.dayEnd ?? data.recurrenceDay.endTime;

	// Use the requisition's referenceTimezone as source of truth (matches admin app).
	// Fall back to America/New_York if the API hasn't supplied one.
	const timezone = requisition.referenceTimezone || 'America/New_York';

	// Convert UTC timestamps to display times in the requisition's timezone.
	const localDayStart = formatTimestampForDisplay(dayStart, timezone);
	const localDayEnd = formatTimestampForDisplay(dayEnd, timezone);

	// Match the admin calendar's compact, identifying event title — discipline
	// name plus requisition ID — so the calendar grid is scannable at a glance.
	// `requisition.title` is a deprecated column that's often null.
	const disciplineLabel = requisition.disciplineName ?? requisition.title ?? '';
	const title = requisition.id ? `#${requisition.id} ${disciplineLabel}`.trim() : disciplineLabel;

	return {
		start: localDayStart, // Display the local start time
		end: localDayEnd, // Display the local end time
		resourceIds: [requisition.id, recurrenceDayId],
		title,
		data: requisition,
		color: status
			? requisitionStatusColorEnum[status as keyof typeof requisitionStatusColorEnum]
			: '#b3b3b3',
		extendedProps: {
			type: 'RECURRENCE_DAY',
			requisition: { ...requisition },
			// Normalize the recurrence day so consumers can rely on dayStart/dayEnd
			// regardless of which endpoint produced the row.
			recurrenceDay: { ...data.recurrenceDay, dayStart, dayEnd },
			workday: { ...workday },
			company: { ...company },
			location: { ...location },
			identityLocked: data.identityLocked ?? false
		}
	};
}
