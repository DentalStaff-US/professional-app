<script lang="ts">
	import { TimesheetsPage } from '$features/timesheets';

	let { data } = $props();
</script>

<TimesheetsPage timesheets={data.timesheets ?? []} />
