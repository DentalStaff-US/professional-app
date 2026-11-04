import { describe, expect, it } from 'vitest';
import { buildShiftIcs } from './ics';

describe('buildShiftIcs', () => {
	const ics = buildShiftIcs({
		id: 'w1',
		title: 'Dental Hygienist, Bright Smiles',
		start: '2026-11-05T12:30:00.000Z',
		end: '2026-11-05T21:00:00.000Z',
		location: '100 Main St, Tampa',
		now: new Date('2026-11-04T00:00:00Z')
	});

	it('stores times in UTC, so calendars show them correctly anywhere', () => {
		expect(ics).toContain('DTSTART:20261105T123000Z');
		expect(ics).toContain('DTEND:20261105T210000Z');
	});
	it('escapes commas in text', () => {
		expect(ics).toContain('SUMMARY:Dental Hygienist\\, Bright Smiles');
		expect(ics).toContain('LOCATION:100 Main St\\, Tampa');
	});
	it('uses CRLF line endings and a stable id', () => {
		expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
		expect(ics).toContain('UID:w1@dtstaffingsolutions.com');
	});
	it('omits optional fields', () => {
		const minimal = buildShiftIcs({ id: 'x', title: 'T', start: '2026-11-05T12:30:00Z', end: '2026-11-05T13:30:00Z' });
		expect(minimal).not.toContain('LOCATION');
		expect(minimal).not.toContain('DESCRIPTION');
	});
});
