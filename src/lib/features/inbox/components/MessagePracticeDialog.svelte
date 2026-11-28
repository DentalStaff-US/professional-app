<script lang="ts">
	import { enhance } from '$app/forms';
	import { Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	let { practiceName, reason, open = $bindable(false) }: { practiceName: string; reason: string; open?: boolean } = $props();

	let body = $state('');
	let sending = $state(false);
	let messageError = $state<string | null>(null);
</script>

<!-- The professional writes the first message here, so starting a conversation
     never leaves an empty thread in the practice's inbox. Success redirects to it. -->
<Dialog.Root bind:open>
	<Dialog.Content
		class="bottom-0 left-0 top-auto max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none rounded-t-2xl p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
	>
		<form
			method="POST"
			action="?/messagePractice"
			class="space-y-4 p-6"
			use:enhance={() => {
				sending = true;
				messageError = null;
				return async ({ result, update }) => {
					sending = false;
					if (result.type === 'failure') {
						messageError = (result.data?.messageError as string) ?? "Your message didn't send. Please try again.";
						return;
					}
					await update();
				};
			}}
		>
			<Dialog.Header class="text-left">
				<Dialog.Title class="text-h2">Message {practiceName}</Dialog.Title>
				<Dialog.Description>{reason}</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-2">
				<Label for="practice-message">Message</Label>
				<Textarea id="practice-message" name="body" rows={5} maxlength={5000} bind:value={body} required class="text-base" />
			</div>

			{#if messageError}
				<p class="text-sm font-semibold text-destructive" role="alert">{messageError}</p>
			{/if}

			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button type="button" variant="outline" class="min-h-11" on:click={() => (open = false)}>Cancel</Button>
				<Button type="submit" class="min-h-11" disabled={sending || !body.trim()}>
					{#if sending}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
					Send message
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
