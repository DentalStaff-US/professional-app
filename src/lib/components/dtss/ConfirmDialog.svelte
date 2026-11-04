<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	let {
		open = $bindable(false),
		title,
		description,
		cancelLabel = 'Go back',
		confirm
	}: {
		open?: boolean;
		title: string;
		description: string;
		cancelLabel?: string;
		/** The confirming button, often inside a form. Cancel takes focus first. */
		confirm: Snippet;
	} = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="gap-2">
			<AlertDialog.Cancel class="min-h-11 sm:min-h-10">{cancelLabel}</AlertDialog.Cancel>
			{@render confirm()}
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
