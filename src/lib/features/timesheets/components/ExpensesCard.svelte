<script lang="ts">
	import { enhance } from '$app/forms';
	import { superForm } from 'sveltekit-superforms/client';
	import { Loader2, Plus, Receipt } from 'lucide-svelte';
	import ConfirmDialog from '$dtss/ConfirmDialog.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	type Expense = {
		id: string;
		description: string;
		amountCents: number;
		status: 'PENDING' | 'APPROVED' | 'REJECTED';
		rejectionReason: string | null;
	};

	let {
		expenses,
		canAdd,
		form
	}: { expenses: Expense[]; canAdd: boolean; form: any } = $props();

	const { enhance: addEnhance, form: addData, submitting } = superForm(form, {
		resetForm: true,
		taintedMessage: null
	});

	let removing = $state<Expense | null>(null);
	let confirmOpen = $state(false);

	const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
	const STATUS_HINTS: Record<string, string> = {
		PENDING: 'An admin or the practice will review this before it goes on the invoice.',
		APPROVED: 'Approved and added to the invoice.',
		REJECTED: "This expense wasn't approved."
	};
</script>

<section class="rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="expenses-heading">
	<h2 id="expenses-heading" class="flex items-center gap-2 text-h3">
		<Receipt class="size-5" aria-hidden="true" /> Expenses
	</h2>
	<p class="mt-1 text-sm text-muted-foreground">
		Reimbursable costs from this week's work. Each one is reviewed before it goes on the invoice.
	</p>

	{#if canAdd}
		<form method="POST" action="?/addExpense" use:addEnhance class="mt-4 grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
			<div class="grid gap-1.5">
				<Label for="expense-description">Description</Label>
				<Input id="expense-description" name="description" class="h-11 text-base" bind:value={$addData.description} placeholder="e.g. Parking, supplies, mileage" disabled={$submitting} required />
			</div>
			<div class="grid gap-1.5">
				<Label for="expense-amount">Amount ($)</Label>
				<Input id="expense-amount" name="amountDollars" type="number" inputmode="decimal" step="0.01" min="0.01" class="h-11 text-base" bind:value={$addData.amountDollars} placeholder="0.00" disabled={$submitting} required />
			</div>
			<Button type="submit" variant="outline" size="lg" disabled={$submitting}>
				{#if $submitting}
					<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" /> Adding…
				{:else}
					<Plus class="mr-2 size-4" aria-hidden="true" /> Add
				{/if}
			</Button>
		</form>
	{/if}

	{#if expenses.length}
		<ul class="mt-4 divide-y rounded-lg border">
			{#each expenses as expense (expense.id)}
				<li class="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 text-sm">
					<div class="min-w-0 flex-1 basis-40">
						<p class="font-semibold">{expense.description}</p>
						{#if expense.status === 'REJECTED' && expense.rejectionReason}
							<p class="text-destructive">Rejected: {expense.rejectionReason}</p>
						{/if}
					</div>
					<p class="font-bold tabular-nums">{money(expense.amountCents)}</p>
					<StatusBadge status={expense.status} hint={STATUS_HINTS[expense.status]} />
					{#if expense.status === 'PENDING' && canAdd}
						<Button
							variant="ghost"
							class="min-h-11 text-destructive"
							aria-label={`Remove ${expense.description}`}
							on:click={() => {
								removing = expense;
								confirmOpen = true;
							}}
						>
							Remove
						</Button>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-4 text-sm text-muted-foreground">No expenses on this timesheet.</p>
	{/if}
</section>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Remove this expense?"
	description={removing ? `${removing.description}, ${money(removing.amountCents)}` : ''}
	cancelLabel="Keep it"
>
	{#snippet confirm()}
		<form
			method="POST"
			action="?/deleteExpense"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					confirmOpen = false;
				}}
		>
			<input type="hidden" name="expenseId" value={removing?.id ?? ''} />
			<Button type="submit" variant="destructive" class="min-h-11 w-full sm:min-h-10">Remove expense</Button>
		</form>
	{/snippet}
</ConfirmDialog>
