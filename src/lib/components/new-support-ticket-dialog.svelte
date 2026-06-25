<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let open: boolean = false;

	let submitting = false;

	const handleSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: true });
			submitting = false;
			open = false;
		};
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-[480px]">
		<form
			method="POST"
			action="/settings/support"
			use:enhance={handleSubmit}
			class="flex min-h-0 flex-1 flex-col"
		>
			<Dialog.Header class="shrink-0 p-6 pb-4">
				<Dialog.Title>Contact Support</Dialog.Title>
				<Dialog.Description>
					Describe the issue you're running into and our team will get back to you.
				</Dialog.Description>
			</Dialog.Header>
			<!-- Only the fields scroll; header + footer stay pinned so the modal
			     never overflows the viewport (esp. on mobile). -->
			<div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-1">
				<div class="space-y-2">
					<Label for="title">Title</Label>
					<Input id="title" name="title" required />
				</div>
				<div class="space-y-2">
					<Label for="expectedResults">What did you expect to happen?</Label>
					<Textarea id="expectedResults" name="expectedResults" required class="min-h-[72px]" />
				</div>
				<div class="space-y-2">
					<Label for="actualResults">What actually happened?</Label>
					<Textarea id="actualResults" name="actualResults" required class="min-h-[72px]" />
				</div>
				<div class="space-y-2">
					<Label for="stepsToReproduce">Steps to reproduce</Label>
					<Textarea id="stepsToReproduce" name="stepsToReproduce" required class="min-h-[72px]" />
				</div>
			</div>
			<Dialog.Footer class="shrink-0 gap-2 border-t p-6 pt-4">
				<Button
					type="button"
					variant="destructiveOutline"
					on:click={() => (open = false)}
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button type="submit" class="bg-primary hover:bg-primary/90" disabled={submitting}>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Submitting...
					{:else}
						Submit Ticket
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
