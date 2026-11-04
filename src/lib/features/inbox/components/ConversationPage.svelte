<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { Loader2, MessagesSquare, Send } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { cn } from '$lib/utils';
	import ConversationAvatar from './ConversationAvatar.svelte';
	import { describeConversation, relativeTime } from '../conversation';
	import { pollWhileVisible } from '../poll';

	let {
		conversation,
		userId,
		form: formData,
		sendError
	}: { conversation: any | null; userId?: string; form: any; sendError?: string } = $props();

	const { form, enhance, errors, submitting } = superForm(formData, { taintedMessage: null });

	const messages = $derived<any[]>(conversation?.messages ?? []);
	const about = $derived(conversation ? describeConversation(conversation, userId) : null);

	let anchor = $state<HTMLElement>();
	let seen = 0;

	const nearBottom = () =>
		document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 240;

	onMount(() => {
		anchor?.scrollIntoView({ block: 'end' });
		seen = messages.length;
		// Loading this thread marked it read, so the Inbox badge is out of date.
		invalidate('inbox:unread');
		return pollWhileVisible('inbox:conversation');
	});

	// Follow new messages, unless they've scrolled up to read something older.
	$effect(() => {
		const count = messages.length;
		if (count === seen) return;
		const follow = seen === 0 || nearBottom();
		seen = count;
		invalidate('inbox:unread');
		if (follow) tick().then(() => anchor?.scrollIntoView({ block: 'end' }));
	});
</script>

<svelte:head><title>Conversation | DTSS</title></svelte:head>

<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 md:px-6">
	{#if !conversation || !about}
		<EmptyState icon={MessagesSquare} title="We couldn't load this conversation" description="Please try again in a moment.">
			<Button href="/inbox" variant="outline">Back to inbox</Button>
		</EmptyState>
	{:else}
		<header class="flex items-center gap-3">
			<ConversationAvatar {...about} />
			<div class="min-w-0">
				<h1 class="truncate text-h3">{about.title}</h1>
				{#if about.subtitle}<p class="truncate text-sm text-muted-foreground">{about.subtitle}</p>{/if}
			</div>
		</header>

		<ol class="flex flex-1 flex-col gap-3 py-5" aria-label="Messages" aria-live="polite">
			{#each messages as message (message.id)}
				{@const mine = message.senderId === userId}
				{#if message.isSystemMessage}
					<li class="self-center rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">{message.body}</li>
				{:else}
					<li class={cn('flex max-w-[85%] flex-col sm:max-w-md', mine ? 'items-end self-end' : 'items-start self-start')}>
						<span class="sr-only">{mine ? 'You' : about.title}:</span>
						<p
							class={cn(
								'whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
								mine ? 'rounded-tr-sm bg-primary-strong text-primary-foreground' : 'rounded-tl-sm border bg-card'
							)}
						>{message.body}</p>
						<time class="mt-1 text-xs text-muted-foreground" datetime={message.createdAt}>{relativeTime(message.createdAt)}</time>
					</li>
				{/if}
			{:else}
				<li class="my-auto text-center text-sm text-muted-foreground">No messages yet. Say hello.</li>
			{/each}
			<li bind:this={anchor} class="scroll-mb-40" aria-hidden="true"></li>
		</ol>

		<!-- Pinned above the tabs. -->
		<form method="POST" use:enhance class="sticky bottom-[var(--tabbar-offset,0px)] -mx-4 border-t bg-card/95 p-3 backdrop-blur md:mx-0 md:rounded-lg md:border">
			{#if sendError || $errors.body}
				<div class="mb-2"><Notice tone="negative" alert>{sendError ?? $errors.body}</Notice></div>
			{/if}
			<div class="flex items-end gap-2">
				<Textarea name="body" aria-label="Message" rows={1} class="min-h-11 flex-1 resize-none text-base" placeholder="Type your message…" bind:value={$form.body} />
				<Button type="submit" size="icon" class="size-11 shrink-0" aria-label="Send message" disabled={$submitting || !$form.body?.trim()}>
					{#if $submitting}
						<Loader2 class="size-5 animate-spin" aria-hidden="true" />
					{:else}
						<Send class="size-5" aria-hidden="true" />
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
