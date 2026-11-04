<script lang="ts">
	import { page } from '$app/state';
	import { PermanentPage, ShiftsPage } from '$features/shifts';
	import AppShell from '$shell/AppShell.svelte';
	import { jobs, pastWorkdays, requisitions, workdays } from '../../fixtures';

	// /_dev/preview/shifts?tab=available|past|permanent&state=empty
	const tab = $derived(page.url.searchParams.get('tab'));
	const empty = $derived(page.url.searchParams.get('state') === 'empty');
</script>

<AppShell pathname="/my-shifts" name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if tab === 'permanent'}
		<PermanentPage requisitions={empty ? [] : jobs} applied={empty ? [] : [jobs[0]]} certLocked={[]} workPreference={undefined} />
	{:else}
		<ShiftsPage
			{tab}
			workdays={empty ? [] : [...workdays, ...pastWorkdays]}
			openShifts={empty ? [] : requisitions}
			certLocked={[]}
			hiddenByAvailability={0}
			showUnavailable={false}
			workPreference={undefined}
			claimForm={null}
		/>
	{/if}
</AppShell>
