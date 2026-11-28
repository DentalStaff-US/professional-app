<script lang="ts">
	import { DocumentsStep } from '$features/onboarding';

	let { data, form } = $props();
</script>

<DocumentsStep documentsForm={data.documentsForm} userId={data.user.id} disciplines={data.disciplines} skipError={form?.message} />
