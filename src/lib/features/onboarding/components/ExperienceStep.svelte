<script lang="ts">
	import PageHeader from '$dtss/PageHeader.svelte';
	import { ExperienceForm } from '$features/profile';

	let { form, disciplines, experienceLevels }: { form: any; disciplines: any[]; experienceLevels: any[] } = $props();
</script>

<svelte:head><title>Add your experience | DTSS</title></svelte:head>

<PageHeader title="Add your work experience" description="Add each discipline you work in, how long you've done it, and the rate you'd like." />

<ExperienceForm {form} {disciplines} {experienceLevels} submitLabel="Save and continue" />
