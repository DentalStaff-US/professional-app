/** Timesheets the professional still has to act on or know about: drafts and returned hours. */
const NEEDS_ATTENTION = new Set(['DRAFT', 'DISCREPANCY']);

export function needsAttention<T extends { timesheet?: { status?: string | null } | null }>(timesheets: T[]): T[] {
	return timesheets.filter((row) => NEEDS_ATTENTION.has(row.timesheet?.status ?? ''));
}
