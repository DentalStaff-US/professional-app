const stamp = (value: string | Date) =>
	new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Commas, semicolons and newlines must be escaped in iCalendar text. */
const escapeText = (text: string) =>
	text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function buildShiftIcs(shift: {
	id: string;
	title: string;
	start: string | Date;
	end: string | Date;
	location?: string | null;
	description?: string | null;
	now?: Date;
}): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Dental Temps Staffing Solutions//Shifts//EN',
		'BEGIN:VEVENT',
		`UID:${shift.id}@dtstaffingsolutions.com`,
		`DTSTAMP:${stamp(shift.now ?? new Date())}`,
		`DTSTART:${stamp(shift.start)}`,
		`DTEND:${stamp(shift.end)}`,
		`SUMMARY:${escapeText(shift.title)}`,
		...(shift.location ? [`LOCATION:${escapeText(shift.location)}`] : []),
		...(shift.description ? [`DESCRIPTION:${escapeText(shift.description)}`] : []),
		'END:VEVENT',
		'END:VCALENDAR'
	];
	return lines.join('\r\n');
}

export function icsDataUrl(ics: string): string {
	return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
