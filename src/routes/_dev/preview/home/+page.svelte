<script lang="ts">
	import { page } from '$app/state';
	import { HomePage } from '$features/dashboard';
	import AppShell from '$shell/AppShell.svelte';
	import { requisitions, timesheets, workdays } from '../../fixtures';

	// /_dev/preview/home?state=first-run|empty
	const state = $derived(page.url.searchParams.get('state'));
</script>

<AppShell pathname="/dashboard" name="Maria Lopez" email="maria@example.com" initials="ML">
	<HomePage
		firstName="Maria"
		workdays={state ? [] : workdays}
		timesheets={state ? [] : timesheets}
		requisitions={state ? [] : requisitions}
		certLocked={[]}
		hiddenByAvailability={0}
		showUnavailable={false}
		workPreference={undefined}
		claimForm={null}
		affiliateStatus={{ programEnabled: true, eligible: true, enrolled: page.url.searchParams.has('enrolled') }}
	/>
</AppShell>
