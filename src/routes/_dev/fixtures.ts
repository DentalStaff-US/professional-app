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

export const todayDate = dayFromNow(0);
export const calendarDays = [
	...workdays.map((w) => ({ ...w, requisition: { ...w.requisition, id: '9', hourlyRate: '48' } })),
	...requisitions.map((r) => ({ ...r, workday: null }))
];
export const shiftDetail = {
	...workdays[0],
	requisition: {
		...workdays[0].requisition,
		companyName: 'Bright Smiles Dental',
		hourlyRate: 48,
		jobDescription: 'Cover a full hygiene schedule. Dentrix experience is helpful.',
		specialInstructions: 'Please park behind the building and use the staff entrance.'
	},
	location: {
		...workdays[0].location,
		companyPhone: '(813) 555-0142',
		email: 'frontdesk@example.com'
	}
};

export const sheetRequisition = { id: 5, disciplineName: 'Dental Hygienist', hourlyRate: 48, referenceTimezone: zone };
export const sheetCompany = { id: 'c1', name: 'Oak Street Family Dentistry', logo: null };
export const sheetDays = [-2, -1, 1].map((days, i) => ({
	workday: { id: `wd${i}` },
	recurrenceDay: { date: dayFromNow(days), dayStart: at(days, 13), dayEnd: at(days, 22) }
}));
export const sheetSaved = [
	{ date: dayFromNow(-2), startTime: at(-2, 13), endTime: at(-2, 22), lunchStartTime: at(-2, 17), lunchEndTime: at(-2, 18), hours: 8 }
];
export const sheetRows = [
	{ timesheet: { id: 't1', weekBeginDate: dayFromNow(-20), status: 'APPROVED' }, company: sheetCompany, requisition: sheetRequisition },
	{ timesheet: { id: 't2', weekBeginDate: dayFromNow(-6), status: 'DISCREPANCY' }, company: sheetCompany, requisition: sheetRequisition },
	{ timesheet: { id: 't3', weekBeginDate: dayFromNow(-1), status: 'DRAFT' }, company: sheetCompany, requisition: sheetRequisition }
];

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
export const inboxConversations = [
	{ id: 'a', type: 'APPLICATION', applicationData: { requisition: { disciplineName: 'Dental Hygienist' }, company: { name: 'Bright Smiles Dental' } }, lastMessage: { body: 'See you Thursday at 7:30. Please use the staff entrance around the back.', createdAt: minutesAgo(12) } },
	{ id: 'b', participants: [{ user: { id: 'me', firstName: 'Maria', lastName: 'Lopez' } }, { user: { id: 'them', firstName: 'Sam', lastName: 'Reed' } }], lastMessage: { body: 'Thanks for covering!', createdAt: minutesAgo(60 * 26) } },
	{ id: 'c', participants: [{ user: { id: 'me' } }, { user: { id: 'x', firstName: 'DTSS', lastName: 'Support' } }], lastMessage: null }
];
export const inboxThread = {
	id: 'a',
	type: 'APPLICATION',
	applicationData: { requisition: { disciplineName: 'Dental Hygienist' }, company: { companyName: 'Bright Smiles Dental' } },
	participants: [{ userId: 'me' }, { userId: 'them' }],
	messages: Array.from({ length: 14 }, (_, i) => ({
		id: `m${i}`,
		senderId: i % 2 ? 'me' : 'them',
		body: i % 2 ? 'Sounds good, thank you!' : 'Hi Maria, can you confirm you can make the 7:30am start? We have a full schedule that day and would love to have you.',
		createdAt: minutesAgo((14 - i) * 40)
	}))
};
