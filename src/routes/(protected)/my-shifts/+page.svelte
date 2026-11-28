<script lang="ts">
	import { ShiftsPage } from '$features/shifts';

	let { data } = $props();
</script>

<ShiftsPage
	tab={data.tab}
	workdays={data.workdays}
	openShifts={data.openShifts}
	certLocked={data.certLocked}
	hiddenByAvailability={data.hiddenByAvailability}
	showUnavailable={data.showUnavailable}
	workPreference={data.workPreference}
	claimForm={data.claimForm}
/>
