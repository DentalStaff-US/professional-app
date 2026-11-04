<script lang="ts">
	import { page } from '$app/state';
	import { ConversationPage, InboxPage } from '$features/inbox';
	import AppShell from '$shell/AppShell.svelte';
	import { inboxConversations, inboxThread } from '../../fixtures';

	// /_dev/preview/inbox?thread=1|missing or ?state=empty|failed
	const thread = $derived(page.url.searchParams.get('thread'));
	const state = $derived(page.url.searchParams.get('state'));
</script>

<AppShell pathname={thread ? '/inbox/a' : '/inbox'} name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if thread}
		<ConversationPage conversation={thread === 'missing' ? null : inboxThread} userId="me" form={null} />
	{:else}
		<InboxPage conversations={state === 'failed' ? null : state === 'empty' ? [] : inboxConversations} userId="me" />
	{/if}
</AppShell>
