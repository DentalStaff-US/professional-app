<script lang="ts">
	import { enhance } from '$app/forms';
	import { Loader2 } from 'lucide-svelte';
	import ConfirmDialog from '$dtss/ConfirmDialog.svelte';
	import { Button } from '$lib/components/ui/button';

	let { workdayId, action = '?/cancelWorkdayShift' }: { workdayId: string; action?: string } = $props();

	let open = $state(false);
	let submitting = $state(false);
</script>

<Button variant="destructive-outline" size="lg" class="w-full" on:click={() => (open = true)}>
	Cancel shift…
</Button>

<ConfirmDialog
	bind:open
	title="Cancel this shift?"
	description="The shift goes back on the board for other professionals, and you may not be able to claim it again."
	cancelLabel="Keep shift"
>
	{#snippet confirm()}
		<form
			method="POST"
			{action}
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
					open = false;
				};
			}}
		>
			<input type="hidden" name="workdayId" value={workdayId} />
			<Button type="submit" variant="destructive" class="min-h-11 w-full sm:min-h-10" disabled={submitting}>
				{#if submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
				Cancel shift
			</Button>
		</form>
	{/snippet}
</ConfirmDialog>
