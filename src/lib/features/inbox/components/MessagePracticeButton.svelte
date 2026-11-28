<script lang="ts">
	import { MessageSquare } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import MessagePracticeDialog from './MessagePracticeDialog.svelte';

	/**
	 * Opens the existing thread with a practice, or starts one through the page's
	 * `?/messagePractice` action. Renders nothing when they may not message it.
	 */
	let {
		conversationId = null,
		canMessage = false,
		practiceName,
		reason,
		class: className
	}: {
		conversationId?: string | null;
		canMessage?: boolean;
		practiceName?: string | null;
		/** Why they can message this practice, shown in the dialog. */
		reason: string;
		class?: string;
	} = $props();

	let open = $state(false);
</script>

{#if conversationId}
	<Button href="/inbox/{conversationId}" variant="outline" class={cn('min-h-11 w-full', className)}>
		<MessageSquare class="mr-2 size-4" aria-hidden="true" /> Message the practice
	</Button>
{:else if canMessage}
	<Button variant="outline" class={cn('min-h-11 w-full', className)} on:click={() => (open = true)}>
		<MessageSquare class="mr-2 size-4" aria-hidden="true" /> Message the practice
	</Button>
	<MessagePracticeDialog practiceName={practiceName ?? 'the practice'} {reason} bind:open />
{/if}
