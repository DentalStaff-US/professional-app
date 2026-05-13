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
	<Dialog.Content
		class="sm:max-w-[480px] max-h-[100dvh] sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto"
	>
		<form
			method="POST"
			action="/settings/support"
			use:enhance={handleSubmit}
			class="space-y-4"
		>
			<Dialog.Header>
				<Dialog.Title>Contact Support</Dialog.Title>
				<Dialog.Description>
					Describe the issue you're running into and our team will get back to you.
				</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-2">
				<Label for="title">Title</Label>
				<Input id="title" name="title" required />
			</div>
			<div class="space-y-2">
				<Label for="expectedResults">What did you expect to happen?</Label>
				<Textarea id="expectedResults" name="expectedResults" required />
			</div>
			<div class="space-y-2">
				<Label for="actualResults">What actually happened?</Label>
				<Textarea id="actualResults" name="actualResults" required />
			</div>
			<div class="space-y-2">
				<Label for="stepsToReproduce">Steps to reproduce (optional)</Label>
				<Textarea id="stepsToReproduce" name="stepsToReproduce" />
			</div>
			<Dialog.Footer class="gap-2">
				<Button type="button" variant="outline" on:click={() => (open = false)} disabled={submitting}>
					Cancel
				</Button>
				<Button type="submit" class="bg-blue-800 hover:bg-blue-900" disabled={submitting}>
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
