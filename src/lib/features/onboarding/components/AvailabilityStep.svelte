<script lang="ts">
	import { enhance } from '$app/forms';
	import Notice from '$dtss/Notice.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import AvailabilityEditor from '$lib/components/availability/AvailabilityEditor.svelte';
	import { COPY, hasZeroDays, normalizeDays } from '$lib/components/availability/availability';
	import { Button } from '$lib/components/ui/button';

	let {
		availableDays,
		blockedDates,
		today,
		error
	}: { availableDays: number[] | null; blockedDates: string[]; today: string; error?: string } = $props();

	// The editor owns no form here (showSaveBar=false), so this page holds the state
	// and the footer buttons.
	let days = $state<number[]>(normalizeDays(availableDays));
	let dates = $state<string[]>([...blockedDates]);
	let submitting = $state(false);

	const neverSet = availableDays === null && blockedDates.length === 0;

	// Mirrors the settings page: all seven ticked on a never-set profile is still
	// "not set", so send null and keep the distinction the server relies on.
	const payloadDays = $derived(neverSet && days.length === 7 ? null : days);

	// The window this submission is authoritative for. A year ahead on first paint;
	// the professional can block further out later from Settings.
	const replaceTo = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;

	const pending = () => {
		submitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			submitting = false;
		};
	};
</script>

<svelte:head><title>When can you work? | DTSS</title></svelte:head>

<PageHeader title={COPY.onboarding.title} description={COPY.onboarding.desc} />

{#if error}<Notice tone="negative" alert>{error}</Notice>{/if}

<section class="rounded-lg border bg-card p-5 shadow-card sm:p-6">
	<AvailabilityEditor
		initialAvailableDays={availableDays}
		initialBlockedDates={blockedDates}
		bind:days
		bind:dates
		{today}
		showSaveBar={false}
		{submitting}
	/>
</section>

<div class="space-y-2">
	<form method="POST" action="?/saveAvailability" use:enhance={pending}>
		<input type="hidden" name="availableDays" value={JSON.stringify(payloadDays)} />
		<input type="hidden" name="blockedDates" value={JSON.stringify(dates)} />
		<input type="hidden" name="replaceFrom" value={today} />
		<input type="hidden" name="replaceTo" value={replaceTo} />
		<Button type="submit" size="lg" class="w-full" disabled={hasZeroDays(days) || submitting}>
			{submitting ? COPY.save.submitting : COPY.onboarding.primary}
		</Button>
	</form>

	<!-- Deliberately NOT equal weight to the primary action, but deliberately
	     obvious: the default is already right for most people. -->
	<form method="POST" action="?/skipAvailability" use:enhance={pending}>
		<Button type="submit" variant="ghost" size="lg" class="w-full" disabled={submitting}>{COPY.onboarding.skip}</Button>
	</form>

	<p class="text-center text-sm text-muted-foreground">{COPY.onboarding.footnote}</p>
</div>
