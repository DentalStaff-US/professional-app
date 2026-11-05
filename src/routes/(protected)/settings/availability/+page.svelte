<script lang="ts">
	import { AvailabilityPage } from '$features/settings';

	let { data } = $props();
</script>

<AvailabilityPage form={data.form} bookedDates={data.bookedDates} today={data.today} loaded={data.availabilityLoaded} setByAdminOn={data.setByAdminOn} />
