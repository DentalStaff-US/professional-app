<script lang="ts">
	import { AlertCircle, Utensils } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { entryProblem, lunchHours, type TimeEntry } from '../hours';

	type Field = 'startTime' | 'endTime' | 'lunchStartTime' | 'lunchEndTime';

	let {
		date,
		label,
		entry,
		started,
		showProblem,
		onchange
	}: {
		date: string;
		label: string;
		entry: TimeEntry;
		started: boolean;
		showProblem: boolean;
		onchange: (field: Field, value: string) => void;
	} = $props();

	const problem = $derived(showProblem ? entryProblem(entry) : null);
	const lunch = $derived(lunchHours(entry.lunchStartTime, entry.lunchEndTime));
	const fields: { field: Field; label: string }[][] = [
		[
			{ field: 'startTime', label: 'Start time' },
			{ field: 'endTime', label: 'End time' }
		],
		[
			{ field: 'lunchStartTime', label: 'Lunch start' },
			{ field: 'lunchEndTime', label: 'Lunch end' }
		]
	];
</script>

<fieldset class="rounded-lg border bg-muted/30 p-4" aria-describedby={problem ? `${date}-problem` : undefined}>
	<legend class="sr-only">{label}</legend>
	<div class="flex items-center justify-between gap-3">
		<p class="font-bold" aria-hidden="true">{label}</p>
		<p class="font-bold tabular-nums text-primary-dark">{entry.hours.toFixed(2)} hrs</p>
	</div>

	{#if !started}
		<p class="mt-2 text-sm text-muted-foreground">You can enter times once this shift starts.</p>
	{/if}

	{#each fields as row, i (i)}
		<div class="mt-3 grid grid-cols-2 items-end gap-3">
			{#each row as { field, label: fieldLabel } (field)}
				<div class="grid min-w-0 gap-1.5">
					<Label for={`${date}-${field}`}>
						{fieldLabel}
						{#if i === 1}<span class="font-normal text-muted-foreground">(optional)</span>{/if}
					</Label>
					<Input
						id={`${date}-${field}`}
						type="time"
						class="h-11 text-base"
						disabled={!started}
						aria-invalid={problem ? 'true' : undefined}
						value={entry[field]}
						on:input={(event) => onchange(field, event.currentTarget.value)}
					/>
				</div>
			{/each}
		</div>
	{/each}

	{#if lunch > 0}
		<p class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
			<Utensils class="size-4" aria-hidden="true" /> Lunch break: {lunch.toFixed(2)} hrs (unpaid)
		</p>
	{/if}
	{#if problem}
		<p id={`${date}-problem`} class="mt-2 flex items-start gap-1.5 text-sm font-semibold text-destructive">
			<AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {problem}
		</p>
	{/if}
</fieldset>
