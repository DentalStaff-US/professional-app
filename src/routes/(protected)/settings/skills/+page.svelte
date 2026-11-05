<script lang="ts">
	import { SkillsPage } from '$features/settings';

	let { data } = $props();
</script>

<SkillsPage skills={data.skills} catalog={data.catalog} editable={data.editable} />
