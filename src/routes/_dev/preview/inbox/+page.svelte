<script lang="ts">
	import { page } from '$app/state';
	import { ConversationPage, InboxPage } from '$features/inbox';
	import AppShell from '$shell/AppShell.svelte';
	import { inboxConversations, inboxThread } from '../../fixtures';

	// /_dev/preview/inbox?thread=1|long|missing or ?state=empty|failed
	const thread = $derived(page.url.searchParams.get('thread'));
	const state = $derived(page.url.searchParams.get('state'));
	const longThread = {
		...inboxThread,
		messages: Array.from({ length: 40 }, (_, index) => ({
			...inboxThread.messages[0],
			id: 1000 + index,
			senderId: index % 2 ? 'me' : 'them',
			isSystemMessage: false,
			body: `Message ${index + 1}`
		}))
	};
</script>

<AppShell pathname={thread ? '/inbox/a' : '/inbox'} name="Maria Lopez" email="maria@example.com" initials="ML" unreadCount={2}>
	{#if thread}
		<ConversationPage conversation={thread === 'missing' ? null : thread === 'long' ? longThread : inboxThread} userId="me" form={null} />
	{:else}
		<InboxPage conversations={state === 'failed' ? null : state === 'empty' ? [] : inboxConversations} userId="me" />
	{/if}
</AppShell>
