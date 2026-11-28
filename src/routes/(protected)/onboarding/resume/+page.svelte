<script lang="ts">
	import { ResumeStep } from '$features/onboarding';

	let { data } = $props();
</script>

<ResumeStep resumeForm={data.resumeForm} />
