<script lang="ts">
	import { enhance } from '$app/forms';
	import { Loader2 } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { DocumentUploadForm, toCredentialDisciplines } from '$features/profile';
	import type { CredentialDiscipline } from '$lib/components/certifications/types';
	import { Button } from '$lib/components/ui/button';

	let {
		documentsForm,
		userId,
		disciplines: rawDisciplines,
		skipError
	}: { documentsForm: any; userId: string; disciplines: any[]; skipError?: string } = $props();

	const disciplines = $derived(toCredentialDisciplines(rawDisciplines));
	const needed = $derived(disciplines.filter((d) => d.requiresLicense || d.requiresCert));

	let skipping = $state(false);

	const needsText = (d: CredentialDiscipline) =>
		[d.requiresLicense && 'a license or registration', d.requiresCert && 'a certification'].filter(Boolean).join(' and ');
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

<DocumentUploadForm form={documentsForm} {disciplines} />

{#if skipError}<Notice tone="negative" alert>{skipError}</Notice>{/if}
<form
	method="POST"
	action="?/skipUpload"
	use:enhance={() => {
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
