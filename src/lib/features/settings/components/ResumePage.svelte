<script lang="ts">
	import { tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { CheckCircle2, Download, FileText } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { FileUpload, uploadFile } from '$features/profile';
	import { Button } from '$lib/components/ui/button';

	let { resume, resumeForm }: { resume: any | null; resumeForm: any } = $props();

	const { enhance, form, errors } = superForm(resumeForm, { taintedMessage: null });

	let formElement = $state<HTMLFormElement>();

	const TIPS = [
		{ title: 'Keep it relevant', text: "Focus on the dental experience and skills that match the work you're after." },
		{ title: 'Highlight certifications', text: 'Put your certifications, continuing education and specialized training up front.' },
		{ title: 'Be specific', text: "Name the technologies, equipment and procedures you've worked with." }
	];

	const uploaded = $derived(
		resume?.createdAt ? new Date(resume.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
	);

	async function upload([file]: File[]) {
		const result = await uploadFile(file);
		if (!result.ok) throw new Error(result.error);
		$form.url = result.url;
		$form.filename = result.filename;
		await tick();
		formElement?.requestSubmit();
	}
</script>

<svelte:head><title>Resume | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Resume" description="Practices use it to see your work history." />

	{#if resume}
		<section class="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-5 shadow-card" aria-label="Current resume">
			<FileText class="size-6 shrink-0 text-primary-dark" aria-hidden="true" />
			<div class="min-w-0 flex-1 basis-48">
				<h2 class="break-words font-bold">{resume.filename ?? 'Your resume'}</h2>
				{#if uploaded}<p class="text-sm text-muted-foreground">Uploaded {uploaded}</p>{/if}
			</div>
			<Button href={resume.uploadUrl} target="_blank" rel="noopener" variant="outline" class="min-h-11 w-full sm:w-auto">
				<Download class="mr-2 size-4" aria-hidden="true" /> Download
			</Button>
		</section>
	{:else}
		<EmptyState icon={FileText} title="No resume yet" description="Add one to help practices learn about your experience." />
	{/if}

	<form bind:this={formElement} use:enhance method="POST" action="?/resumeUpload" class="space-y-3" aria-labelledby="upload-heading">
		<h2 id="upload-heading" class="text-h3">{resume ? 'Replace your resume' : 'Add your resume'}</h2>
		{#if ($errors as any)._errors?.length}
			<Notice tone="negative" alert>{($errors as any)._errors[0]}</Notice>
		{/if}
		<FileUpload label="Your resume" hint="PDF, Word or text, up to 5MB." accept={['.pdf', '.doc', '.docx', '.txt']} maxSizeMB={5} onfiles={upload} />
		<input type="hidden" name="url" value={$form.url ?? ''} />
		<input type="hidden" name="filename" value={$form.filename ?? ''} />
	</form>

	<section aria-labelledby="tips-heading">
		<h2 id="tips-heading" class="text-h3">Resume tips</h2>
		<ul class="mt-3 grid gap-4 md:grid-cols-3">
			{#each TIPS as tip (tip.title)}
				<li class="flex gap-2">
					<CheckCircle2 class="mt-0.5 size-5 shrink-0 text-status-positive-fg" aria-hidden="true" />
					<div>
						<p class="font-semibold">{tip.title}</p>
						<p class="text-sm text-muted-foreground">{tip.text}</p>
					</div>
				</li>
			{/each}
		</ul>
	</section>
</Page>
