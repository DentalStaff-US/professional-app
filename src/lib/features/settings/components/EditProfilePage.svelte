<script lang="ts">
	import { tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { Loader2 } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import AddressSearchAutocomplete from '$lib/components/AddressSearchAutocomplete.svelte';
	import AvatarUpload from '$lib/components/general/avatar-upload.svelte';
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { AddressResult } from '$lib/types';

	let { user, profile, form, avatarForm }: { user: any; profile: any; form: any; avatarForm: any } = $props();

	/**
	 * Mirrors WORK_PREFERENCE_LABELS in the admin app's $lib/server/workPreference,
	 * which is the authority — the two repos share a database but no code. The help
	 * text lives only here because only the professional sees it.
	 */
	const WORK_PREFERENCE_OPTIONS = [
		{ value: 'BOTH', label: 'Both temporary and permanent', help: 'See every job you qualify for. This is the default.' },
		{ value: 'TEMP', label: 'Temporary shifts only', help: "Day-to-day shifts. Permanent positions won't be shown to you." },
		{
			value: 'PERMANENT',
			label: 'Permanent positions only',
			help: "Full-time roles. Temporary shifts won't be shown to you, and you won't be texted about them."
		}
	] as const;

	let selected = $state<AddressResult | null>(null);
	let avatarSubmit = $state<HTMLFormElement>();

	const { enhance, form: formData, errors, submitting } = superForm(form, {
		taintedMessage: null,
		onResult: ({ result }) => {
			// Clear the autocomplete selection on a successful save so the next
			// visit/edit starts from a clean slate. Mirrors the admin app's
			// professionals/[id] page behaviour.
			if (result.type === 'success') selected = null;
		}
	});
	const { form: avatarData, enhance: avatarEnhance, errors: avatarErrors } = superForm(avatarForm, { taintedMessage: null });

	const fieldError = (messages: unknown) => (Array.isArray(messages) ? messages[0] : undefined);
	const avatarError = $derived(fieldError(($avatarErrors as any).url) ?? ($avatarErrors as any)._errors?.[0]);

	const street = $derived(
		[selected?.address_components?.street_number, selected?.address_components?.street_name].filter(Boolean).join(' ')
	);

	async function avatarUpdated(url: string) {
		$avatarData.url = url;
		await tick();
		if (url) avatarSubmit?.requestSubmit();
	}
</script>

{#snippet field(id: string, label: string, messages: unknown, control: import('svelte').Snippet)}
	<div>
		<Label for={id}>{label}</Label>
		<div class="mt-1.5">{@render control()}</div>
		{#if fieldError(messages)}<p class="mt-1 text-sm font-semibold text-destructive">{fieldError(messages)}</p>{/if}
	</div>
{/snippet}

<svelte:head><title>Edit profile | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Edit profile" />

	{#if profile}
		<section class="space-y-4 rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="photo-heading">
			<h2 id="photo-heading" class="text-h3">Profile photo</h2>
			<AvatarUpload {user} onAvatarUpdated={avatarUpdated} />
			<form bind:this={avatarSubmit} class="hidden" method="POST" action="?/avatarUpload" use:avatarEnhance>
				<input type="hidden" name="url" value={$avatarData.url ?? ''} />
			</form>
			{#if avatarError}<Notice tone="negative" alert>{avatarError}</Notice>{/if}
		</section>

		<form method="POST" action="?/submitProfile" use:enhance class="space-y-6">
			{#if ($errors as any)._errors?.length}
				<Notice tone="negative" alert>{($errors as any)._errors[0]}</Notice>
			{/if}

			<section class="space-y-5 rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="details-heading">
				<h2 id="details-heading" class="text-h3">Your details</h2>
				<div class="grid gap-5 md:grid-cols-2">
					{#snippet firstName()}<Input id="firstName" name="firstName" autocomplete="given-name" bind:value={$formData.firstName} class="h-11" />{/snippet}
					{@render field('firstName', 'First name', $errors.firstName, firstName)}
					{#snippet lastName()}<Input id="lastName" name="lastName" autocomplete="family-name" bind:value={$formData.lastName} class="h-11" />{/snippet}
					{@render field('lastName', 'Last name', $errors.lastName, lastName)}
					{#snippet email()}<Input id="email" name="email" type="email" autocomplete="email" bind:value={$formData.email} class="h-11" />{/snippet}
					{@render field('email', 'Email', $errors.email, email)}
					{#snippet cellPhone()}<PhoneInput id="cellPhone" name="cellPhone" bind:value={$formData.cellPhone} class="h-11" />{/snippet}
					{@render field('cellPhone', 'Cell phone', $errors.cellPhone, cellPhone)}
					{#snippet birthday()}<Input id="birthday" name="birthday" type="date" bind:value={$formData.birthday} class="h-11" />{/snippet}
					{@render field('birthday', 'Birthday', $errors.birthday, birthday)}
				</div>
			</section>

			<section class="space-y-3 rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="location-heading">
				<h2 id="location-heading" class="text-h3">Home address</h2>
				<p class="text-muted-foreground">{profile.completeAddress || 'No address on file yet.'}</p>
				<Label for="address-search" class="sr-only">Change your address</Label>
				<AddressSearchAutocomplete id="address-search" bind:selected placeholder="Search for a new address" country="us" maxResults={8} />
				{#if selected}
					<input type="hidden" name="completeAddress" value={selected.formatted_address} />
					<input type="hidden" name="lat" value={selected.coordinates.lat} />
					<input type="hidden" name="lon" value={selected.coordinates.lng} />
					<!-- Granular components so the profile stays filterable in the admin app. -->
					<input type="hidden" name="address" value={street} />
					<input type="hidden" name="city" value={selected.context?.place || selected.context?.locality || ''} />
					<input type="hidden" name="state" value={selected.context?.region_code || selected.context?.region || ''} />
					<input type="hidden" name="zipcode" value={selected.context?.postcode || ''} />
				{/if}
			</section>

			<!--
				Radios rather than a select: three options, all worth reading, and the
				consequence of each needs stating. Blank is NOT an option here — the server
				treats "never answered" as both, but once this form is in front of them an
				unanswered radio group would just look broken.
			-->
			<fieldset class="space-y-3 rounded-lg border bg-card p-5 shadow-card sm:p-6">
				<legend class="sr-only">What work are you looking for?</legend>
				<p class="text-h3" aria-hidden="true">What work are you looking for?</p>
				<p class="text-muted-foreground">This controls which jobs you see.</p>
				{#each WORK_PREFERENCE_OPTIONS as option (option.value)}
					<label class="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors duration-fast has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
						<input type="radio" name="workPreference" value={option.value} class="mt-1 size-4 accent-primary-strong" bind:group={$formData.workPreference} />
						<span>
							<span class="block font-semibold">{option.label}</span>
							<span class="block text-sm text-muted-foreground">{option.help}</span>
						</span>
					</label>
				{/each}
			</fieldset>

			<Button type="submit" size="lg" class="w-full sm:w-auto" disabled={$submitting}>
				{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
				Save changes
			</Button>
		</form>
	{/if}
</Page>
