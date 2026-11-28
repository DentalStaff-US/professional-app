<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { FileText, Loader2, X } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import { todayInET } from '$lib/certStatus';
	import CredentialFields from '$lib/components/certifications/CredentialFields.svelte';
	import type { CredentialDiscipline } from '$lib/components/certifications/types';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { CANDIDATE_DOCUMENT_TYPES, CANDIDATE_DOCUMENT_TYPE_LABELS } from '$lib/config/zod-schemas';
	import { uploadFile } from '../upload';
	import FileUpload from './FileUpload.svelte';

	let { form: documentsForm, disciplines }: { form: any; disciplines: CredentialDiscipline[] } = $props();

	let uploaded = $state<{ filename: string; url: string }[]>([]);
	let failures = $state<string[]>([]);

	const { enhance, form, errors, submitting } = superForm(documentsForm, {
		taintedMessage: null,
		onUpdated: ({ form: result }) => {
			if (result.valid) {
				uploaded = [];
				failures = [];
			}
		}
	});

	// Never submit when a file finishes uploading. The natural order is to pick the
	// file, then say what it is and when it expires, and details entered after an
	// automatic submit never arrive. The file is in storage; the form waits for Save.
	async function upload(files: File[]) {
		const results = await Promise.all(files.map(uploadFile));
		uploaded = [...uploaded, ...results.flatMap((r) => (r.ok ? [{ filename: r.filename, url: r.url }] : []))];
		failures = results.flatMap((r) => (r.ok ? [] : [r.error]));
	}

	const saveLabel = $derived(
		uploaded.length ? `Save ${uploaded.length} ${uploaded.length === 1 ? 'document' : 'documents'}` : 'Add a file to save'
	);
	const select =
		'mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72';
</script>

<form use:enhance method="POST" action="?/documentsUpload" class="space-y-5 rounded-lg border bg-card p-5 shadow-card sm:p-6">
	{#if ($errors as any)._errors?.length}
		<Notice tone="negative" alert>{($errors as any)._errors[0]}</Notice>
	{/if}

	<FileUpload
		label="Your documents"
		hint="Photos, PDF, Word or text, up to 10MB each."
		accept={['image/*', '.pdf', '.doc', '.docx', '.txt']}
		multiple
		camera
		onfiles={upload}
	/>

	{#if failures.length}
		<Notice tone="negative" alert title="Some files didn't upload">
			<ul>
				{#each failures as failure (failure)}<li>{failure}</li>{/each}
			</ul>
		</Notice>
	{/if}

	{#if uploaded.length}
		<ul class="divide-y rounded-md border" aria-label="Ready to save">
			{#each uploaded as file (file.url)}
				<li class="flex items-center gap-2 py-1 pl-3 pr-1 text-sm">
					<FileText class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span class="min-w-0 flex-1 truncate font-semibold">{file.filename}</span>
					<Button type="button" variant="ghost" size="icon" class="size-11 text-muted-foreground" aria-label={`Remove ${file.filename}`} on:click={() => (uploaded = uploaded.filter((other) => other !== file))}>
						<X class="size-4" aria-hidden="true" />
					</Button>
				</li>
			{/each}
		</ul>
	{/if}

	<div>
		<Label for="documentType">Document type</Label>
		<select id="documentType" name="documentType" bind:value={$form.documentType} class={select}>
			{#each CANDIDATE_DOCUMENT_TYPES as type (type)}
				<option value={type}>{CANDIDATE_DOCUMENT_TYPE_LABELS[type]}</option>
			{/each}
		</select>
		<p class="mt-1 text-sm text-muted-foreground">Used for every file in this upload.</p>
	</div>

	<CredentialFields
		documentType={$form.documentType}
		{disciplines}
		bind:disciplineId={$form.documentDisciplineId}
		bind:expiryDate={$form.documentExpiryDate}
		minDate={todayInET()}
	/>

	<Button type="submit" size="lg" class="w-full sm:w-auto" disabled={!uploaded.length || $submitting}>
		{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
		{saveLabel}
	</Button>

	<input type="hidden" name="urls" value={JSON.stringify(uploaded.map((file) => file.url))} />
	<input type="hidden" name="filesData" value={JSON.stringify(uploaded)} />
</form>
