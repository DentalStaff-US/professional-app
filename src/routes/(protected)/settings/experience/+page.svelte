<script lang="ts">
	import { ExperiencePage } from '$features/settings';

	let { data } = $props();
</script>

<ExperiencePage
	form={data.form}
	profile={data.profile}
	disciplines={data.disciplines ?? []}
	candidateDisciplines={data.candidateDisciplines ?? []}
	experienceLevels={data.experienceLevels ?? []}
	documents={data.documents ?? []}
/>
