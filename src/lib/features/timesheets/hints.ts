export const TIMESHEET_STATUS_HINTS: Record<string, string> = {
	DRAFT: "Not submitted yet. Save as you go, then submit when you're ready.",
	PENDING: 'Submitted and waiting for approval.',
	DISCREPANCY: 'These hours are being reviewed. An admin will follow up with you.',
	APPROVED: 'Approved and sent for processing.',
	VOID: 'This timesheet was cancelled.',
	REJECTED: 'This timesheet was rejected.'
};

export const TIMESHEET_STATUS_MESSAGE: Record<string, string> = {
	PENDING: 'This timesheet is waiting for approval.',
	APPROVED: 'This timesheet has been approved and processed.',
	VOID: 'This timesheet has been voided.',
	REJECTED: 'This timesheet has been rejected.'
};
