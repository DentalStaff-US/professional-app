<script lang="ts">
	import { page } from '$app/state';
	import { AvailabilityStep, AwaitingApprovalPage, buildChecklist, DocumentsStep, ExperienceStep, OnboardingFrame, ProfileStep, ResumeStep } from '$features/onboarding';
	import { ExperiencePage } from '$features/settings';
	import AppShell from '$shell/AppShell.svelte';

	// /_dev/preview/onboarding?view=profile|experience|resume|documents|availability|awaiting|awaiting-failed|denied|settings|settings-locked
	const view = $derived(page.url.searchParams.get('view') ?? 'profile');
	const form = (data: object) => ({ id: view, valid: true, posted: false, errors: {}, data, constraints: {} });
	const disciplines = [{ id: 'd1', name: 'Dental Hygienist' }, { id: 'd2', name: 'Dental Assistant' }, { id: 'd3', name: 'EFDA' }];
	const levels = [{ id: 'l3', value: '10+ years' }, { id: 'l1', value: '0-2 Years' }, { id: 'l2', value: '2-5 Years' }];
	const mine = [
		{ disciplineId: 'd3', name: 'EFDA', abbreviation: 'EFDA', experienceLevelId: 'l2', preferredHourlyMin: 30, preferredHourlyMax: 40, requiresLicense: true, requiresCert: true, effectiveCertExpiry: '2029-06-01', effectiveLicenseExpiry: null }
	];
	const checklist = buildChecklist({ profile: { completeAddress: null, cellPhone: '+15555555555' }, disciplines: mine, documents: [{ type: 'CERTIFICATE' }], hasResume: true });
	const STEP: Record<string, number> = { profile: 0, experience: 1, resume: 2, documents: 3, availability: 4 };
	const path = $derived(view.startsWith('settings') ? '/settings/experience' : '/onboarding');
</script>

<AppShell pathname={path} name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if view === 'settings'}
		<ExperiencePage form={form({ disciplines: [] })} profile={{ status: 'PENDING' }} {disciplines} candidateDisciplines={mine} experienceLevels={levels} documents={[]} />
	{:else if view === 'settings-locked'}
		<ExperiencePage form={form({ disciplines: [] })} profile={{ status: 'ACTIVE' }} {disciplines} candidateDisciplines={mine} experienceLevels={levels} documents={[]} />
	{:else}
		<OnboardingFrame current={STEP[view] ?? -1}>
			{#if view === 'profile'}
				<ProfileStep user={{ firstName: 'Maria', lastName: 'Lopez' }} form={form({ birthday: '', cellPhone: '' })} avatarForm={form({ url: '' })} />
			{:else if view === 'experience'}
				<ExperienceStep form={form({ disciplines: [] })} {disciplines} experienceLevels={levels} />
			{:else if view === 'resume'}
				<ResumeStep resumeForm={form({ url: '', filename: '' })} />
			{:else if view === 'documents'}
				<DocumentsStep documentsForm={form({ documentType: 'LICENSE', documentDisciplineId: '', documentExpiryDate: '' })} userId="u1" disciplines={mine} />
			{:else if view === 'availability'}
				<AvailabilityStep availableDays={null} blockedDates={[]} today="2026-11-04" />
			{:else}
				<AwaitingApprovalPage status={view === 'denied' ? 'DENIED' : 'PENDING'} submittedAt="2026-11-01T12:00:00Z" checklist={view === 'awaiting-failed' ? null : checklist} supportEmail="support@example.com" />
			{/if}
		</OnboardingFrame>
	{/if}
</AppShell>
