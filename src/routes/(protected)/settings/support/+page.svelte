<script lang="ts">
	import { SupportPage } from '$features/settings';

	let { data } = $props();
</script>

<SupportPage tickets={data.tickets ?? []} />
