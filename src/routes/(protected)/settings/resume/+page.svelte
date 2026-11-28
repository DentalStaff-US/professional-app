<script lang="ts">
	import { ResumePage } from '$features/settings';

	let { data } = $props();
</script>

<ResumePage resume={data.resume} resumeForm={data.resumeForm} />
