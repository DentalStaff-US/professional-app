import { startOfWeek, format, parse } from 'date-fns';

// Work weeks run Monday → Sunday everywhere in this app. The cron job that
// owns timesheet creation (`processTimesheetCreation`) computes
// weekBeginDate as Monday in the requisition's timezone; this helper agrees
// so any client-side computation lines up with what the DB stores.
export function getConsistentWeekBeginDate(dateString: string): string {
	const date = parse(dateString, 'yyyy-MM-dd', new Date());
	const weekBegin = startOfWeek(date, { weekStartsOn: 1 });
	return format(weekBegin, 'yyyy-MM-dd');
}
