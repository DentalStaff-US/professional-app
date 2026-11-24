<script lang="ts">
	import { page } from '$app/state';
	import { PermanentPage, ShiftsPage } from '$features/shifts';
	import { shiftsTab } from '$features/shifts/split';
	import AppShell from '$shell/AppShell.svelte';
	import { jobs, pastWorkdays, requisitions, workdays } from '../../fixtures';

	// /_dev/preview/shifts?tab=upcoming|past|permanent&state=empty
	const tab = $derived(page.url.searchParams.get('tab'));
	const shifts = $derived(shiftsTab(tab));
	const empty = $derived(page.url.searchParams.get('state') === 'empty');
</script>

<AppShell pathname="/my-shifts" name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if tab === 'permanent'}
		<PermanentPage requisitions={empty ? [] : jobs} applied={empty ? [] : [jobs[0]]} certLocked={[]} workPreference={undefined} />
	{:else}
		<ShiftsPage
			tab={shifts}
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
