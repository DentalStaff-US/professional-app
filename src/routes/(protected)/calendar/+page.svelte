<script lang="ts">
	import { CalendarPage } from '$features/shifts';

	let { data } = $props();
</script>

<CalendarPage
	recurrenceDays={data.recurrenceDays}
	today={data.today}
	focusDate={data.focusDate}
	focusReqId={data.focusReqId}
	hiddenByAvailability={data.hiddenByAvailability ?? 0}
	showUnavailable={data.showUnavailable}
	workPreference={data.workPreference}
	claimForm={data.claimForm}
	availabilityForm={data.availabilityForm}
	availabilityLoaded={data.availabilityLoaded}
	bookedDates={data.bookedDates}
/>
