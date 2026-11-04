const zone = 'America/New_York';
const dayFromNow = (days: number) => {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};
const at = (days: number, hour: number) => `${dayFromNow(days)}T${String(hour).padStart(2, '0')}:00:00.000Z`;

const openShift = (id: string, days: number, discipline: string, rate: string, city: string, extra = {}) => ({
	identityLocked: true,
	company: {},
	location: { city, state: 'FL', distanceMiles: 6 },
	requisition: { id, disciplineName: discipline, hourlyRate: rate, referenceTimezone: zone, experienceLevelName: '3+ years' },
	recurrenceDay: { id: `day-${id}`, date: `${dayFromNow(days)}T00:00:00.000Z`, dayStart: at(days, 12), dayEnd: at(days, 21), status: 'OPEN' },
	...extra
});

export const requisitions = [
	openShift('1', 1, 'Dental Hygienist', '48', 'Tampa'),
	openShift('2', 3, 'Dental Assistant', '26', 'Clearwater'),
	openShift('3', 5, 'Front Office', '24', 'St. Petersburg', { blockedByAvailability: true, blockedReason: 'WEEKDAY' }),
	openShift('4', 8, 'Dental Hygienist', '50', 'Tampa')
];

export const workdays = [
	{
		workday: { id: 'w1' },
		company: { companyName: 'Bright Smiles Dental' },
		location: { name: 'Downtown office', completeAddress: '100 Main St, Tampa, FL 33602' },
		requisition: { disciplineName: 'Dental Hygienist', referenceTimezone: zone },
		recurrenceDay: { date: `${dayFromNow(1)}T00:00:00.000Z`, dayStart: at(1, 12), dayEnd: at(1, 21), status: 'FILLED' }
	}
];

export const timesheets = [
	{
		timesheet: { id: 't1', weekBeginDate: dayFromNow(-9), status: 'DRAFT', totalHoursWorked: 24 },
		company: { name: 'Oak Street Family Dentistry' },
		requisition: { disciplineName: 'Dental Hygienist' }
	}
];

export const pastWorkdays = [-3, -35].map((days, i) => ({
	workday: { id: `p${i}` },
	company: { name: 'Oak Street Family Dentistry' },
	location: { name: 'Oak Street', completeAddress: '42 Oak St, Clearwater, FL 33755' },
	requisition: { disciplineName: 'Dental Assistant', hourlyRate: '26', referenceTimezone: zone },
	recurrenceDay: { date: `${dayFromNow(days)}T00:00:00.000Z`, dayStart: at(days, 12), dayEnd: at(days, 21), status: 'FILLED' },
	timesheet: i === 0 ? { id: 't9', totalHoursWorked: 8 } : null
}));

export const jobs = [
	{ id: 11, disciplineName: 'Dental Hygienist', identityLocked: true, company: {}, permanentPosition: true, location: { city: 'Tampa', state: 'FL' }, distanceMiles: 7 },
	{ id: 12, disciplineName: 'Office Manager', identityLocked: false, company: { companyName: 'Bright Smiles Dental' }, permanentPosition: true, location: { completeAddress: '100 Main St, Tampa, FL 33602' } }
];
