export const TIMESHEET_STATUS_HINTS: Record<string, string> = {
	DRAFT: "Not submitted yet. Save as you go, then submit when you're ready.",
	PENDING: 'Submitted and waiting for approval.',
	DISCREPANCY: 'These hours are being reviewed. An admin will follow up with you.',
	APPROVED: 'Your hours were approved.',
	VOID: 'This timesheet was cancelled.',
	REJECTED: 'This timesheet was rejected.'
};

export const TIMESHEET_STATUS_MESSAGE: Record<string, string> = {
	PENDING: 'This timesheet is waiting for approval.',
	APPROVED: 'This timesheet has been approved.',
	VOID: 'This timesheet has been voided.',
	REJECTED: 'This timesheet has been rejected.'
};

const WAGES: Record<string, { label: string; hint: string }> = {
	WAGES_DUE: { label: 'Wages due', hint: "Your pay for these hours hasn't been marked as paid yet." },
	WAGES_PAID: { label: 'Wages paid', hint: 'DTSS has marked your pay for these hours as paid.' }
};

/** Whether they've been paid for a timesheet. Only approved hours are owed. */
export function wagesBadge(timesheet: { status?: string | null; wagesStatus?: string | null } | null | undefined) {
	const status = timesheet?.status === 'APPROVED' ? timesheet.wagesStatus : null;
	return status && WAGES[status] ? { status, ...WAGES[status] } : null;
}
