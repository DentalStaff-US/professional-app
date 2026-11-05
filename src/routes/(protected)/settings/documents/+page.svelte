<script lang="ts">
	import { DocumentsPage } from '$features/settings';

	let { data } = $props();
</script>

<DocumentsPage documents={data.documents} documentsForm={data.documentsForm} disciplines={data.disciplines} editable={data.editable} canEditCredentialMetadata={data.canEditCredentialMetadata} />
