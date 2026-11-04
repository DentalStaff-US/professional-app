<script lang="ts">
	import { ConversationPage } from '$features/inbox';

	let { data, form } = $props();
</script>

{#key data.conversation?.id}
	<ConversationPage
		conversation={data.conversation}
		userId={data.user?.id}
		form={data.form}
		sendError={form?.error}
	/>
{/key}
