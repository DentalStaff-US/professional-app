<script lang="ts">
	import { AvailabilityStep } from '$features/onboarding';

	let { data, form } = $props();
</script>

<AvailabilityStep availableDays={data.availableDays} blockedDates={data.blockedDates} today={data.today} error={form?.message} />
