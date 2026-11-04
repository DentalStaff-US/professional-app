<script lang="ts">
	import { HomePage } from '$features/dashboard';

	let { data } = $props();
</script>

<HomePage
	firstName={data.user?.firstName}
	workdays={data.workdays}
	timesheets={data.timesheets}
	requisitions={data.requisitions}
	certLocked={data.certLocked ?? []}
	hiddenByAvailability={data.hiddenByAvailability ?? 0}
	showUnavailable={data.showUnavailable ?? false}
	workPreference={data.workPreference}
	claimForm={data.claimForm}
/>
