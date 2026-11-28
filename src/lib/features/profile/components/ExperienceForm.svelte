<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Loader2, Plus, X } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { rowErrors, rowIsBlank, sortLevels, toEntries, type ExperienceRow, type RowErrors } from '../experience';

	type Saved = { disciplineId: string; experienceLevelId: string; preferredHourlyMin?: number | null; preferredHourlyMax?: number | null };

	let {
		form,
		disciplines,
		experienceLevels,
		saved = [],
		submitLabel
	}: {
		form: any;
		disciplines: { id: string; name: string }[];
		experienceLevels: { id: string; value: string }[];
		saved?: Saved[];
		submitLabel: string;
	} = $props();

	let nextKey = 0;
	const blank = (): ExperienceRow => ({ key: nextKey++, disciplineId: '', experienceLevelId: '', min: '', max: '' });

	let rows = $state<ExperienceRow[]>(
		saved.length
			? saved.map((entry) => ({
					key: nextKey++,
					disciplineId: entry.disciplineId,
					experienceLevelId: entry.experienceLevelId,
					min: entry.preferredHourlyMin ?? '',
					max: entry.preferredHourlyMax ?? ''
				}))
			: [blank()]
	);
	let attempted = $state(false);

	const levels = $derived(sortLevels(experienceLevels));
	const errorsFor = (row: ExperienceRow): RowErrors => (attempted && !rowIsBlank(row) ? rowErrors(row) : {});
	const nothingAdded = $derived(rows.every(rowIsBlank));
	const invalid = $derived(rows.some((row) => !rowIsBlank(row) && Object.keys(rowErrors(row)).length > 0));

	const {
		enhance,
		form: formData,
		errors,
		message,
		submitting
	} = superForm(form, {
		dataType: 'json',
		taintedMessage: null,
		onSubmit: ({ cancel }) => {
			attempted = true;
			if (nothingAdded || invalid) cancel();
		}
	});

	// A superForm with dataType json posts this store, not the inputs.
	$effect(() => {
		const entries = toEntries(rows);
		formData.update((data: any) => ({ ...data, disciplines: entries }));
	});

	const taken = (row: ExperienceRow) => new Set(rows.filter((other) => other !== row).map((other) => other.disciplineId));
	const allowAnother = $derived(rows.length < disciplines.length);
	const serverError = $derived(($errors as any)?._errors?.[0] ?? ($errors as any)?.disciplines?._errors?.[0]);

	function remove(row: ExperienceRow) {
		rows = rows.filter((other) => other !== row);
		if (!rows.length) rows = [blank()];
	}

	const select =
		'h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<form method="POST" action="?/submitExperience" use:enhance class="space-y-4" novalidate>
	{#if serverError}
		<Notice tone="negative" alert>{serverError}</Notice>
	{:else if attempted && nothingAdded}
		<Notice tone="negative" alert>Add at least one discipline to continue.</Notice>
	{:else if attempted && invalid}
		<Notice tone="negative" alert>Please fix the highlighted details below.</Notice>
	{:else if $message}
		<Notice tone="positive">{$message}</Notice>
	{/if}

	<ul class="space-y-4">
		{#each rows as row (row.key)}
			{@const rowError = errorsFor(row)}
			<li class="space-y-4 rounded-lg border bg-card p-5 shadow-card">
				<div>
					<div class="flex items-center justify-between gap-2">
						<Label for={`discipline-${row.key}`}>Discipline</Label>
						{#if rows.length > 1}
							<Button type="button" variant="ghost" size="icon" class="-mr-2 -mt-2 size-11 text-muted-foreground" aria-label="Remove this discipline" on:click={() => remove(row)}>
								<X class="size-4" aria-hidden="true" />
							</Button>
						{/if}
					</div>
					<select id={`discipline-${row.key}`} bind:value={row.disciplineId} class={`${select} mt-1.5`} aria-invalid={!!rowError.discipline}>
						<option value="">Choose a discipline</option>
						{#each disciplines as discipline (discipline.id)}
							{#if !taken(row).has(discipline.id)}<option value={discipline.id}>{discipline.name}</option>{/if}
						{/each}
					</select>
					{#if rowError.discipline}<p class="mt-1 text-sm font-semibold text-destructive">{rowError.discipline}</p>{/if}
				</div>

				<div>
					<Label for={`level-${row.key}`}>Experience</Label>
					<select id={`level-${row.key}`} bind:value={row.experienceLevelId} class={`${select} mt-1.5`} aria-invalid={!!rowError.level}>
						<option value="">Choose your experience</option>
						{#each levels as level (level.id)}
							<option value={level.id}>{level.value}</option>
						{/each}
					</select>
					{#if rowError.level}<p class="mt-1 text-sm font-semibold text-destructive">{rowError.level}</p>{/if}
				</div>

				<fieldset>
					<legend class="text-sm font-medium">Preferred hourly rate <span class="font-normal text-muted-foreground">(optional)</span></legend>
					<div class="mt-1.5 grid grid-cols-2 gap-3">
						{#each [{ id: 'min', label: 'Minimum' }, { id: 'max', label: 'Maximum' }] as field (field.id)}
							<div class="relative">
								<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">$</span>
								{#if field.id === 'min'}
									<Input type="number" min="0" step="1" inputmode="numeric" aria-label={field.label} placeholder={field.label} bind:value={row.min} class="h-11 pl-7" />
								{:else}
									<Input type="number" min="0" step="1" inputmode="numeric" aria-label={field.label} placeholder={field.label} bind:value={row.max} class="h-11 pl-7" />
								{/if}
							</div>
						{/each}
					</div>
					{#if rowError.rate}<p class="mt-1 text-sm font-semibold text-destructive">{rowError.rate}</p>{/if}
				</fieldset>
			</li>
		{/each}
	</ul>

	{#if allowAnother}
		<Button type="button" variant="outline" size="lg" class="w-full" on:click={() => (rows = [...rows, blank()])}>
			<Plus class="mr-2 size-4" aria-hidden="true" /> Add another discipline
		</Button>
	{/if}

	<Button type="submit" size="lg" class="w-full sm:w-auto" disabled={$submitting}>
		{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
		{submitLabel}
	</Button>
</form>
