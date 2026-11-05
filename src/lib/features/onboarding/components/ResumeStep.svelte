<script lang="ts">
	import { tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import Notice from '$dtss/Notice.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { FileUpload, uploadFile } from '$features/profile';

	let { resumeForm }: { resumeForm: any } = $props();

	const { enhance, form, errors } = superForm(resumeForm, { taintedMessage: null });

	let formElement = $state<HTMLFormElement>();

	async function upload([file]: File[]) {
		const result = await uploadFile(file);
		if (!result.ok) throw new Error(result.error);
		$form.url = result.url;
		$form.filename = result.filename;
		await tick();
		formElement?.requestSubmit();
	}
</script>

<svelte:head><title>Add your resume | DTSS</title></svelte:head>

<PageHeader title="Add your resume" description="Practices use it to see your work history." />

<form bind:this={formElement} use:enhance method="POST" action="?/resumeUpload" class="space-y-4">
	{#if ($errors as any)._errors?.length}
		<Notice tone="negative" alert>{($errors as any)._errors[0]}</Notice>
	{/if}
	<FileUpload label="Your resume" hint="PDF, Word or text, up to 5MB." accept={['.pdf', '.doc', '.docx', '.txt']} maxSizeMB={5} onfiles={upload} />
	<input type="hidden" name="url" value={$form.url ?? ''} />
	<input type="hidden" name="filename" value={$form.filename ?? ''} />
</form>
