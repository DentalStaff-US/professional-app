<script lang="ts">
	import { InboxPage } from '$features/inbox';

	let { data } = $props();
</script>

<InboxPage conversations={data.conversations} userId={data.user?.id} />
