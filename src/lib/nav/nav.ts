import { Calendar, CalendarDays, Home, Inbox, User } from 'lucide-svelte';

export const TABS = [
	{ href: '/dashboard', label: 'Home', icon: Home, match: ['/dashboard'] },
	{ href: '/my-shifts', label: 'Shifts', icon: CalendarDays, match: ['/my-shifts', '/permanent', '/company'] },
	{ href: '/calendar', label: 'Calendar', icon: Calendar, match: ['/calendar'] },
	{ href: '/inbox', label: 'Inbox', icon: Inbox, match: ['/inbox'] },
	{ href: '/settings', label: 'Me', icon: User, match: ['/settings', '/timesheets'] }
];

const under = (pathname: string, prefix: string) =>
	pathname === prefix || pathname.startsWith(`${prefix}/`);

export function activeTab(pathname: string): string | null {
	return TABS.find((tab) => tab.match.some((prefix) => under(pathname, prefix)))?.href ?? null;
}

/** Onboarding is a focused flow, so it has no tabs to wander off through. */
export function showsTabs(pathname: string): boolean {
	return !under(pathname, '/onboarding');
}

const INNER_PAGES: { pattern: RegExp; title: string; back: string }[] = [
	{ pattern: /^\/my-shifts\/[^/]+/, title: 'Shift details', back: '/my-shifts' },
	{ pattern: /^\/permanent\/[^/]+/, title: 'Job details', back: '/permanent' },
	{ pattern: /^\/company\/[^/]+/, title: 'Practice', back: '/permanent' },
	{ pattern: /^\/inbox\/[^/]+/, title: 'Conversation', back: '/inbox' },
	{ pattern: /^\/timesheets\/[^/]+/, title: 'Timesheet', back: '/timesheets' },
	{ pattern: /^\/timesheets$/, title: 'Timesheets', back: '/settings' },
	{ pattern: /^\/settings\/support\/[^/]+/, title: 'Support ticket', back: '/settings/support' },
	{ pattern: /^\/settings\/edit-profile/, title: 'Edit profile', back: '/settings' },
	{ pattern: /^\/settings\/resume/, title: 'Resume', back: '/settings' },
	{ pattern: /^\/settings\/experience/, title: 'Experience', back: '/settings' },
	{ pattern: /^\/settings\/skills/, title: 'Skills', back: '/settings' },
	{ pattern: /^\/settings\/availability/, title: 'Availability', back: '/settings' },
	{ pattern: /^\/settings\/documents/, title: 'Documents', back: '/settings' },
	{ pattern: /^\/settings\/notifications/, title: 'Notifications', back: '/settings' },
	{ pattern: /^\/settings\/security/, title: 'Two-factor authentication', back: '/settings' },
	{ pattern: /^\/settings\/support/, title: 'Support', back: '/settings' }
];

export function innerPage(pathname: string): { title: string; back: string } | null {
	const page = INNER_PAGES.find((candidate) => candidate.pattern.test(pathname));
	return page ? { title: page.title, back: page.back } : null;
}
