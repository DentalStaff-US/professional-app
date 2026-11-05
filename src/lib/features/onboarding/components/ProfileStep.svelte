<script lang="ts">
	import { tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { Loader2 } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import AddressSearchAutocomplete from '$lib/components/AddressSearchAutocomplete.svelte';
	import AvatarUpload from '$lib/components/general/avatar-upload.svelte';
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { AddressResult } from '$lib/types';

	let { user, form, avatarForm }: { user: any; form: any; avatarForm: any } = $props();

	const { enhance, form: formData, errors, submitting } = superForm(form, { taintedMessage: null });
	const { form: avatarData, enhance: avatarEnhance, errors: avatarErrors } = superForm(avatarForm, { taintedMessage: null });

	let avatarSubmit = $state<HTMLFormElement>();
	let selected = $state<AddressResult | null>(null);

	const street = $derived(
		[selected?.address_components?.street_number, selected?.address_components?.street_name].filter(Boolean).join(' ')
	);
	const fieldError = (messages: unknown) => (Array.isArray(messages) ? messages[0] : undefined);
	const avatarError = $derived(fieldError(($avatarErrors as any).url) ?? ($avatarErrors as any)._errors?.[0]);

	async function avatarUpdated(url: string) {
		$avatarData.url = url;
		await tick();
		if (url) avatarSubmit?.requestSubmit();
	}
</script>

<svelte:head><title>Set up your profile | DTSS</title></svelte:head>

<PageHeader title="Let's set up your profile" description="This helps us show you work near you and keep in touch about it." />

<section class="space-y-6 rounded-lg border bg-card p-5 shadow-card sm:p-6">
	<AvatarUpload {user} onAvatarUpdated={avatarUpdated} />
	<form bind:this={avatarSubmit} class="hidden" method="POST" action="?/avatarUpload" use:avatarEnhance>
		<input type="hidden" name="url" value={$avatarData.url ?? ''} />
	</form>
	{#if avatarError}<Notice tone="negative" alert>{avatarError}</Notice>{/if}

	<form action="?/submitProfile" method="POST" use:enhance class="space-y-5">
		{#if ($errors as any)._errors?.length}
			<Notice tone="negative" alert>{($errors as any)._errors[0]}</Notice>
		{/if}

		<div>
			<Label for="address-search">Home address</Label>
			<p class="mb-1.5 text-sm text-muted-foreground">We use it to find work near you.</p>
			<AddressSearchAutocomplete id="address-search" bind:selected placeholder="Start typing your address" country="us" maxResults={8} />
			<input type="hidden" name="completeAddress" value={selected?.formatted_address ?? ''} />
			<input type="hidden" name="lat" value={selected?.coordinates.lat ?? ''} />
			<input type="hidden" name="lon" value={selected?.coordinates.lng ?? ''} />
			<!-- Granular components so the profile stays filterable in the admin app. -->
			<input type="hidden" name="address" value={street} />
			<input type="hidden" name="city" value={selected?.context?.place || selected?.context?.locality || ''} />
			<input type="hidden" name="state" value={selected?.context?.region_code || selected?.context?.region || ''} />
			<input type="hidden" name="zipcode" value={selected?.context?.postcode || ''} />
		</div>

		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<Label for="birthday">Birthday</Label>
				<Input id="birthday" name="birthday" type="date" bind:value={$formData.birthday} class="mt-1.5 h-11" aria-invalid={!!$errors.birthday} />
				{#if fieldError($errors.birthday)}<p class="mt-1 text-sm font-semibold text-destructive">{fieldError($errors.birthday)}</p>{/if}
			</div>
			<div>
				<Label for="cellPhone">Cell phone</Label>
				<PhoneInput id="cellPhone" name="cellPhone" bind:value={$formData.cellPhone} class="mt-1.5 h-11" />
				{#if fieldError($errors.cellPhone)}<p class="mt-1 text-sm font-semibold text-destructive">{fieldError($errors.cellPhone)}</p>{/if}
			</div>
		</div>

		<Button type="submit" size="lg" class="w-full sm:w-auto" disabled={$submitting}>
			{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
			Save and continue
		</Button>
	</form>
</section>
