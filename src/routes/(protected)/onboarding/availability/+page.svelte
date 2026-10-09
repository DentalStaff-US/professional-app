<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import AvailabilityEditor from '$lib/components/availability/AvailabilityEditor.svelte';
	import { COPY, hasZeroDays, normalizeDays } from '$lib/components/availability/availability';

	export let data: PageData;

	// The editor owns no form here (showSaveBar=false), so this page holds the state
	// and the footer buttons.
	let days: number[] = normalizeDays(data.availableDays);
	let dates: string[] = [...data.blockedDates];
	let submitting = false;

	const neverSet = data.availableDays === null && data.blockedDates.length === 0;

	// Mirrors the settings page: all seven ticked on a never-set profile is still
	// "not set", so send null and keep the distinction the server relies on.
	$: payloadDays = neverSet && days.length === 7 ? null : days;
	$: zeroDays = hasZeroDays(days);

	// The window this submission is authoritative for. A year ahead on first paint;
	// the professional can block further out later from Settings.
	const replaceFrom = data.today;
	const replaceTo = `${Number(data.today.slice(0, 4)) + 1}${data.today.slice(4)}`;
</script>

<svelte:head>
	<title>When can you work? | DTSS</title>
</svelte:head>

<section class="sm:container grid max-w-2xl items-center gap-6">
	<Card.Root class="border-0 shadow-none sm:border sm:shadow-sm">
		<Card.Header class="space-y-1">
			<Card.Title class="text-2xl">{COPY.onboarding.title}</Card.Title>
			<Card.Description>{COPY.onboarding.desc}</Card.Description>
		</Card.Header>
		<Card.Content>
			<AvailabilityEditor
				initialAvailableDays={data.availableDays}
				initialBlockedDates={data.blockedDates}
				bind:days
				bind:dates
				today={data.today}
				showSaveBar={false}
				{submitting}
			/>

			<div class="mt-8 space-y-3">
				<form
					method="POST"
					action="?/saveAvailability"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="availableDays" value={JSON.stringify(payloadDays)} />
					<input type="hidden" name="blockedDates" value={JSON.stringify(dates)} />
					<input type="hidden" name="replaceFrom" value={replaceFrom} />
					<input type="hidden" name="replaceTo" value={replaceTo} />
					<Button type="submit" class="w-full" disabled={zeroDays || submitting}>
						{submitting ? COPY.save.submitting : COPY.onboarding.primary}
					</Button>
				</form>

				<!-- Deliberately NOT equal weight to the primary action, but deliberately
				     obvious: the default is already right for most people. -->
				<form method="POST" action="?/skipAvailability" use:enhance>
					<Button type="submit" variant="ghost" class="w-full" disabled={submitting}>
						{COPY.onboarding.skip}
					</Button>
				</form>

				<p class="text-center text-xs text-muted-foreground">{COPY.onboarding.footnote}</p>
			</div>
		</Card.Content>
	</Card.Root>
</section>
