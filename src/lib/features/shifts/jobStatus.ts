export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | null;

/**
 * The job's own state, once it's past OPEN. Payment states read as filled because a
 * professional doesn't need to know about billing.
 */
export function jobStatusLabel(status: string | null | undefined): { label: string; status: string } | null {
	if (!status || status === 'OPEN') return null;
	if (status === 'CANCELED') return { label: 'Cancelled', status: 'CANCELED' };
	if (status === 'CLOSED') return { label: 'Closed', status: 'CLOSED' };
	return { label: 'Position filled', status: 'FILLED' };
}

/** An applicant always sees their own application's status over the job's. */
export function applyButtonState(application: ApplicationStatus, canApply: boolean) {
	if (application === 'PENDING') return { label: 'Application pending', disabled: true };
	if (application === 'APPROVED') return { label: 'Approved', disabled: true };
	if (application === 'DENIED') return { label: 'Not under consideration', disabled: true };
	return canApply
		? { label: 'Apply for this job', disabled: false }
		: { label: 'Not accepting applications', disabled: true };
}
