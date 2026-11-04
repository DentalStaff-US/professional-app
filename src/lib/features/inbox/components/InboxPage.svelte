<script lang="ts">
	import { onMount } from 'svelte';
	import { Inbox, Search } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import ConversationAvatar from './ConversationAvatar.svelte';
	import { describeConversation, filterConversations, relativeTime, sortConversations } from '../conversation';
	import { pollWhileVisible } from '../poll';

	let { conversations, userId }: { conversations: any[] | null; userId?: string } = $props();

	let query = $state('');
	const sorted = $derived(sortConversations(conversations ?? []));
	const visible = $derived(filterConversations(sorted, query, userId));

	onMount(() => pollWhileVisible('inbox:list'));
</script>

<svelte:head><title>Inbox | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Inbox" />

	<!-- null means the load failed; the shell banner already says so. -->
	{#if conversations !== null}
		{#if sorted.length}
			<div class="relative">
				<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
				<Input type="search" aria-label="Search conversations" placeholder="Search conversations" class="h-11 pl-9 text-base" bind:value={query} />
			</div>
		{/if}

		{#if visible.length}
			<ul class="divide-y overflow-hidden rounded-lg border bg-card shadow-card">
				{#each visible as conversation (conversation.id)}
					{@const about = describeConversation(conversation, userId)}
					{@const unread = Number(conversation.unreadCount ?? 0) > 0}
					<li>
						<a
							href={`/inbox/${conversation.id}`}
							class="flex items-start gap-3 p-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
						>
							<ConversationAvatar {...about} />
							<span class="min-w-0 flex-1">
								<span class="flex items-baseline justify-between gap-3">
									<span class="flex min-w-0 items-center gap-2">
										{#if unread}
											<span class="size-2 shrink-0 rounded-full bg-primary-strong" aria-hidden="true"></span>
											<span class="sr-only">Unread:</span>
										{/if}
										<span class="truncate font-bold">{about.title}</span>
									</span>
									<time class="shrink-0 text-xs text-muted-foreground" datetime={conversation.lastMessage?.createdAt}>
										{relativeTime(conversation.lastMessage?.createdAt)}
									</time>
								</span>
								{#if about.subtitle}<span class="block truncate text-sm text-muted-foreground">{about.subtitle}</span>{/if}
								{#if conversation.lastMessage?.body}
									<span class={`mt-1 block truncate text-sm ${unread ? 'font-bold' : ''}`}>{conversation.lastMessage.body}</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else if query.trim()}
			<EmptyState icon={Search} title={`No results for "${query.trim()}"`} description="Try a practice name, a role or part of a message.">
				<Button variant="outline" on:click={() => (query = '')}>Clear search</Button>
			</EmptyState>
		{:else}
			<EmptyState icon={Inbox} title="No messages yet" description="Conversations with practices and the DTSS team show up here.">
				<Button href="/settings/support" variant="outline">Contact support</Button>
			</EmptyState>
		{/if}
	{/if}
</Page>
