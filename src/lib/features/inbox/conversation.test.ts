import { describe, expect, it } from 'vitest';
import {
	describeConversation,
	filterConversations,
	initialsOf,
	relativeTime,
	sortConversations
} from './conversation';

const job = {
	id: 'a',
	applicationData: {
		requisition: { disciplineName: 'Dental Hygienist' },
		company: { name: 'Bright Smiles Dental' }
	},
	lastMessage: { body: 'See you Thursday', createdAt: '2026-11-04T10:00:00Z' }
};
const person = {
	id: 'b',
	participants: [
		{ user: { id: 'me', firstName: 'Maria', lastName: 'Lopez' } },
		{ user: { id: 'them', firstName: 'Sam', lastName: 'Reed' } }
	],
	lastMessage: { body: 'Thanks!', createdAt: '2026-11-04T12:00:00Z' }
};

describe('describeConversation', () => {
	it('names a job conversation after the job and practice', () => {
		expect(describeConversation(job, 'me')).toMatchObject({ title: 'Dental Hygienist', subtitle: 'Bright Smiles Dental', isOrganization: true });
	});
	it('accepts the company field the thread endpoint uses', () => {
		const thread = { id: 'c', applicationData: { requisition: {}, company: { companyName: 'Oak Street' } } };
		expect(describeConversation(thread, 'me').subtitle).toBe('Oak Street');
	});
	it('names a direct conversation after the other person, in either shape', () => {
		expect(describeConversation(person, 'me').title).toBe('Sam Reed');
		const flat = { id: 'd', participants: [{ userId: 'me', firstName: 'M' }, { userId: 'them', firstName: 'Sam' }] };
		expect(describeConversation(flat, 'me').title).toBe('Sam');
	});
	it('never renders an empty name', () => {
		expect(describeConversation({ id: 'e', participants: [] }, 'me').title).toBe('DTSS team');
	});
});

describe('filterConversations', () => {
	it('matches names, practices and message text, ignoring case', () => {
		expect(filterConversations([job, person], 'bright', 'me')).toEqual([job]);
		expect(filterConversations([job, person], 'SAM', 'me')).toEqual([person]);
		expect(filterConversations([job, person], 'thursday', 'me')).toEqual([job]);
	});
	it('returns everything for a blank search', () => {
		expect(filterConversations([job, person], '  ', 'me')).toHaveLength(2);
	});
	it("doesn't match on the professional's own name", () => {
		expect(filterConversations([person], 'maria', 'me')).toEqual([]);
	});
});

describe('sortConversations', () => {
	it('puts the newest first and empty conversations last', () => {
		const empty = { id: 'z' };
		expect(sortConversations([job, empty, person]).map((c) => c.id)).toEqual(['b', 'a', 'z']);
	});
});

describe('relativeTime', () => {
	const now = new Date('2026-11-04T12:00:00Z');
	it.each([
		['2026-11-04T11:59:40Z', 'Just now'],
		['2026-11-04T11:30:00Z', '30m ago'],
		['2026-11-04T09:00:00Z', '3h ago'],
		['2026-11-01T12:00:00Z', '3d ago']
	])('%s reads as %s', (value, expected) => {
		expect(relativeTime(value, now)).toBe(expected);
	});
	it('handles missing values', () => {
		expect(relativeTime(null, now)).toBe('');
	});
});

describe('initialsOf', () => {
	it('takes two letters', () => {
		expect(initialsOf('Bright Smiles Dental')).toBe('BS');
	});
});
