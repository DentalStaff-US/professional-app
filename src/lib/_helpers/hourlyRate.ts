type Rate = number | string | null | undefined;

/**
 * The rate a professional is paid: the timesheet's adjusted rate when an admin
 * has set one (0 counts), else the requisition's. Same rule the admin app bills
 * and pays wages by.
 */
export function payRate(
	requisition: { hourlyRate?: Rate } | null | undefined,
	timesheet?: { adjustedHourlyRate?: Rate } | null
): { rate: number | null; base: number | null; adjusted: boolean } {
	const base = toNumber(requisition?.hourlyRate);
	const override = toNumber(timesheet?.adjustedHourlyRate);
	const rate = override ?? base;
	return { rate, base, adjusted: override !== null && override !== base };
}

function toNumber(value: Rate): number | null {
	if (value === null || value === undefined || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
