<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms/client';
	import AvailabilityEditor from '$lib/components/availability/AvailabilityEditor.svelte';
	import { COPY, type AvailabilityState } from '$lib/components/availability/availability';
	import * as Alert from '$lib/components/ui/alert';

	export let data: PageData;

	// dataType: 'json' is required for the two arrays — raw formData cannot carry
	// them. Same reason settings/experience uses it for its repeating rows.
	const { enhance, submitting, form: formData } = superForm(data.form, {
		dataType: 'json',
		id: 'availability'
	});

	let formEl: HTMLFormElement;

	function handleSave(state: AvailabilityState) {
		$formData.availableDays = state.availableDays;
		$formData.blockedDates = state.blockedDates;
		// The editor's save button is type="button", so the submit is explicit here.
		formEl.requestSubmit();
	}

	const formattedAdminDate = data.setByAdminOn
		? new Date(data.setByAdminOn).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			})
		: null;
</script>

<svelte:head>
	<title>Availability | DTSS</title>
</svelte:head>

<section class="mx-auto max-w-2xl px-4 py-8">
	<header class="mb-6 space-y-2">
		<h1 class="text-2xl font-bold tracking-tight">{COPY.page.title}</h1>
		<p class="text-sm text-muted-foreground">{COPY.page.lead}</p>
	</header>

	{#if data.loadError}
		<Alert.Root variant="destructive" class="mb-6">
			<Alert.Description>{data.loadError}</Alert.Description>
		</Alert.Root>
	{/if}

	<form method="POST" action="?/saveAvailability" use:enhance bind:this={formEl}>
		<AvailabilityEditor
			initialAvailableDays={data.form.data.availableDays}
			initialBlockedDates={data.form.data.blockedDates}
			bookedDates={data.bookedDates}
			today={data.today}
			loaded={data.availabilityLoaded}
			submitting={$submitting}
			setByAdminOn={formattedAdminDate}
			onSave={handleSave}
		/>
	</form>
</section>
