import { describe, expect, it } from 'vitest';
import { activeTab, innerPage, showsTabs } from './nav';

describe('activeTab', () => {
	it.each([
		['/dashboard', '/dashboard'],
		['/my-shifts', '/my-shifts'],
		['/my-shifts/abc', '/my-shifts'],
		['/permanent/12', '/my-shifts'],
		['/company/12', '/my-shifts'],
		['/calendar', '/calendar'],
		['/inbox/abc', '/inbox'],
		['/settings/documents', '/settings'],
		['/timesheets/abc', '/settings']
	])('%s belongs to %s', (pathname, tab) => {
		expect(activeTab(pathname)).toBe(tab);
	});

	it('does not match a route that only shares a prefix', () => {
		expect(activeTab('/inboxes')).toBeNull();
	});
});

describe('showsTabs', () => {
	it('hides tabs through onboarding', () => {
		expect(showsTabs('/onboarding/documents')).toBe(false);
		expect(showsTabs('/dashboard')).toBe(true);
	});
});

describe('innerPage', () => {
	it('gives inner pages a title and a way back', () => {
		expect(innerPage('/my-shifts/abc')).toEqual({ title: 'Shift details', back: '/my-shifts?tab=upcoming' });
		expect(innerPage('/settings/support/9')?.back).toBe('/settings/support');
		expect(innerPage('/settings/support')?.back).toBe('/settings');
	});

	it('leaves top-level tabs alone', () => {
		expect(innerPage('/dashboard')).toBeNull();
		expect(innerPage('/settings')).toBeNull();
		expect(innerPage('/my-shifts')).toBeNull();
	});
});
