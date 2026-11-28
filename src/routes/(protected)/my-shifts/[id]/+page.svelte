<script lang="ts">
	import { ShiftDetailPage } from '$features/shifts';

	let { data } = $props();
</script>

<ShiftDetailPage shift={data.workday} />
