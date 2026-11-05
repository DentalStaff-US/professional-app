<script lang="ts">
	import { tick } from 'svelte';
	import { enhance as enhanceAction } from '$app/forms';
	import { superForm } from 'sveltekit-superforms/client';
	import { Loader2 } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { FileUpload, uploadFile } from '$features/profile';
	import { todayInET } from '$lib/certStatus';
	import CredentialFields from '$lib/components/certifications/CredentialFields.svelte';
	import type { CredentialDiscipline } from '$lib/components/certifications/types';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { CANDIDATE_DOCUMENT_TYPES, CANDIDATE_DOCUMENT_TYPE_LABELS } from '$lib/config/zod-schemas';

	let {
		documentsForm,
		userId,
		disciplines: rawDisciplines,
		skipError
	}: { documentsForm: any; userId: string; disciplines: any[]; skipError?: string } = $props();

	const disciplines: CredentialDiscipline[] = (rawDisciplines ?? []).map((d: any) => ({
		disciplineId: d.disciplineId,
		name: d.name,
		abbreviation: d.abbreviation,
		requiresLicense: Boolean(d.requiresLicense),
		effectiveLicenseExpiry: d.effectiveLicenseExpiry ?? null,
		licenseGraceStartedOn: d.licenseGraceStartedOn ?? null,
		requiresCert: Boolean(d.requiresCert),
		effectiveCertExpiry: d.effectiveCertExpiry ?? null
	}));
	const needed = disciplines.filter((d) => d.requiresLicense || d.requiresCert);

	const { enhance, form, errors, submitting } = superForm(documentsForm, { taintedMessage: null });

	let formElement = $state<HTMLFormElement>();
	let uploaded = $state<{ filename: string; url: string }[]>([]);
	let failures = $state<string[]>([]);
	let skipping = $state(false);

	async function upload(files: File[]) {
		const results = await Promise.all(files.map(uploadFile));
		const worked = results.flatMap((result) => (result.ok ? [{ filename: result.filename, url: result.url }] : []));
		uploaded = [...uploaded, ...worked];
		failures = results.flatMap((result) => (result.ok ? [] : [result.error]));
		// Saving moves on to the next step, so a partial failure stays here where it can be fixed.
		if (!failures.length && uploaded.length) await save();
	}

	async function save() {
		await tick();
		formElement?.requestSubmit();
	}

	const needsText = (d: CredentialDiscipline) =>
		[d.requiresLicense && 'a license or registration', d.requiresCert && 'a certification'].filter(Boolean).join(' and ');
	const select =
		'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72';
</script>

<svelte:head><title>Add your documents | DTSS</title></svelte:head>

<PageHeader title="Add your documents" description="Licenses, certifications, registrations and permits. You can skip this for now, but your approval may take longer without them." />

{#if needed.length}
	<section class="rounded-lg border bg-card p-5 shadow-card" aria-labelledby="needs-heading">
		<h2 id="needs-heading" class="text-h3">What your disciplines need</h2>
		<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
			{#each needed as discipline (discipline.disciplineId)}
				<li><span class="font-semibold text-foreground">{discipline.name}:</span> {needsText(discipline)}</li>
			{/each}
		</ul>
	</section>
{/if}

<form bind:this={formElement} use:enhance method="POST" action="?/documentsUpload" class="space-y-5 rounded-lg border bg-card p-5 shadow-card sm:p-6">
	{#if ($errors as any)._errors?.length}
		<Notice tone="negative" alert>{($errors as any)._errors[0]}</Notice>
	{/if}

	<div>
		<Label for="documentType">Document type</Label>
		<select id="documentType" name="documentType" bind:value={$form.documentType} class={select}>
			{#each CANDIDATE_DOCUMENT_TYPES as type (type)}
				<option value={type}>{CANDIDATE_DOCUMENT_TYPE_LABELS[type]}</option>
			{/each}
		</select>
		<p class="mt-1 text-sm text-muted-foreground">Used for every file you add here. You can change it later in Documents.</p>
	</div>

	<CredentialFields
		documentType={$form.documentType}
		{disciplines}
		bind:disciplineId={$form.documentDisciplineId}
		bind:expiryDate={$form.documentExpiryDate}
		minDate={todayInET()}
	/>

	<FileUpload
		label="Your documents"
		hint="Photos, PDF, Word or text, up to 10MB each."
		accept={['image/*', '.pdf', '.doc', '.docx', '.txt']}
		multiple
		camera
		onfiles={upload}
	/>

	{#if failures.length}
		<Notice tone="negative" alert title={uploaded.length ? `${uploaded.length} uploaded, ${failures.length} didn't` : "Those files didn't upload"}>
			<ul>
				{#each failures as failure (failure)}<li>{failure}</li>{/each}
			</ul>
		</Notice>
		{#if uploaded.length}
			<Button type="button" size="lg" class="w-full sm:w-auto" disabled={$submitting} on:click={save}>
				{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
				Continue with {uploaded.length} {uploaded.length === 1 ? 'file' : 'files'}
			</Button>
		{/if}
	{/if}

	<input type="hidden" name="urls" value={JSON.stringify(uploaded.map((file) => file.url))} />
	<input type="hidden" name="filesData" value={JSON.stringify(uploaded)} />
</form>

{#if skipError}<Notice tone="negative" alert>{skipError}</Notice>{/if}
<form
	method="POST"
	action="?/skipUpload"
	use:enhanceAction={() => {
		skipping = true;
		return async ({ update }) => {
			await update();
			skipping = false;
		};
	}}
>
	<input type="hidden" name="userId" value={userId} />
	<Button type="submit" variant="ghost" size="lg" class="w-full sm:w-auto" disabled={skipping}>
		{#if skipping}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
		Skip for now
	</Button>
</form>
