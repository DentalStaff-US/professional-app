<script lang="ts">
	import { ExperienceStep } from '$features/onboarding';

	let { data } = $props();
</script>

<ExperienceStep form={data.form} disciplines={data.disciplines} experienceLevels={data.experienceLevels} />
