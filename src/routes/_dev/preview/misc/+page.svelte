<script lang="ts">
	import { page } from '$app/state';
	import { NotificationsPage, SettingsMenu } from '$features/settings';
	import { CompanyPage, JobDetailPage } from '$features/shifts';
	import AppShell from '$shell/AppShell.svelte';
	import { jobs } from '../../fixtures';

	// /_dev/preview/misc?view=job|job-locked|job-pending|job-missing|company|me|me-enrolled|notifications
	const view = $derived(page.url.searchParams.get('view') ?? 'me');
	const job = { ...jobs[1], jobDescription: 'Lead our front office team.\nFull time, Monday to Friday.', specialInstructions: 'Please include two references.' };
	const locked = { ...jobs[0], jobDescription: 'Full-time hygiene role.' };
	const path = $derived(view.startsWith('job') ? '/permanent/1' : view === 'company' ? '/company/1' : view === 'notifications' ? '/settings/notifications' : '/settings');
</script>

<AppShell pathname={path} name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if view === 'job' || view === 'job-locked' || view === 'job-pending' || view === 'job-missing'}
		<JobDetailPage
			job={view === 'job-missing' ? null : view === 'job-locked' ? locked : job}
			application={view === 'job-pending' ? 'PENDING' : null}
			reqStatus="OPEN"
			canApply={view !== 'job-pending'}
			applyForm={null}
		/>
	{:else if view === 'company'}
		<CompanyPage company={{ id: 'c1', companyName: 'Bright Smiles Dental', baseLocation: 'Tampa, FL', companyDescription: 'A family practice serving Tampa since 1998.' }} requisitions={[{ id: 5, disciplineName: 'Office Manager', permanentPosition: true, location: { city: 'Tampa', state: 'FL' } }]} />
	{:else if view === 'notifications'}
		<NotificationsPage receiveSms={true} receiveEmail={false} />
	{:else}
		<SettingsMenu name="Maria Lopez" email="maria@example.com" initials="ML" affiliate={{ programEnabled: true, eligible: true, enrolled: view === 'me-enrolled', status: 'ACTIVE', connectComplete: false }} />
	{/if}
</AppShell>
