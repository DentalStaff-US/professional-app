<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import AvailabilityEditor from '$lib/components/availability/AvailabilityEditor.svelte';
	import { COPY, type AvailabilityState } from '$lib/components/availability/availability';

	let {
		form,
		bookedDates,
		today,
		loaded,
		setByAdminOn
	}: { form: any; bookedDates: any[]; today: string; loaded: boolean; setByAdminOn?: string | null } = $props();

	// dataType: 'json' is required for the two arrays — raw formData cannot carry them.
	const { enhance, submitting, form: formData } = superForm(form, {
		dataType: 'json',
		id: 'availability',
		taintedMessage: null
	});

	let formElement = $state<HTMLFormElement>();

	function save(state: AvailabilityState) {
		$formData.availableDays = state.availableDays;
		$formData.blockedDates = state.blockedDates;
		// The editor's save button is type="button", so the submit is explicit here.
		formElement?.requestSubmit();
	}

	const adminDate = $derived(
		setByAdminOn ? new Date(setByAdminOn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
	);
</script>

<svelte:head><title>Availability | DTSS</title></svelte:head>

<Page>
	<PageHeader title={COPY.page.title} description={COPY.page.lead} />

	<form method="POST" action="?/saveAvailability" use:enhance bind:this={formElement} class="max-w-2xl">
		<AvailabilityEditor
			initialAvailableDays={form.data.availableDays}
			initialBlockedDates={form.data.blockedDates}
			{bookedDates}
			{today}
			{loaded}
			submitting={$submitting}
			setByAdminOn={adminDate}
			onSave={save}
		/>
	</form>
</Page>
