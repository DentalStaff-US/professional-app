<script lang="ts">
	import { PermanentPage } from '$features/shifts';

	let { data } = $props();
</script>

<PermanentPage
	requisitions={data.requisitions ?? []}
	applied={data.applied}
	certLocked={data.certLocked ?? []}
	workPreference={data.workPreference}
/>
