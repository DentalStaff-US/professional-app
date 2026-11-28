export const ONBOARDING_STEPS = [
	{ href: '/onboarding', label: 'Profile' },
	{ href: '/onboarding/experience', label: 'Experience' },
	{ href: '/onboarding/resume', label: 'Resume' },
	{ href: '/onboarding/documents', label: 'Documents' },
	{ href: '/onboarding/availability', label: 'Availability' }
];

/** -1 once the steps are behind them, on the awaiting-approval page. */
export function currentStepIndex(pathname: string): number {
	const path = pathname.replace(/\/$/, '');
	return ONBOARDING_STEPS.findIndex((step) => step.href === path);
}
