<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import * as Alert from '$lib/components/ui/alert';
  import { AlertCircle } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { superForm } from 'sveltekit-superforms/client';
  import FileDropzone from '$lib/components/general/file-dropzone.svelte';
	import { tick } from 'svelte';

	export let data: PageData;

  const resumeForm = superForm(data.resumeForm);
    const { enhance: resumeEnhance, form: resumeFormData, errors: resumeErrors } = resumeForm;
  async function handleResumeUpload(file: File | undefined) {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('location', 'candidate-documents');

      try {
        const response = await fetch('/api/uploadFile', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload resume');
        }

        const data = await response.json();

        console.log({data})
        $resumeFormData.url = data.url;
        $resumeFormData.filename = data.fileName;

        // After successfully setting the URL in the form data, submit the form
        await tick();

        if ($resumeFormData.url?.length) {
          const form = document.getElementById('resume-form') as HTMLFormElement;
          if (form) {
            // Ensure the hidden input has the value
            const input = form.querySelector('input[name="url"]') as HTMLInputElement;
            const filenameInput = form.querySelector('input[name="filename"]') as HTMLInputElement;
            if (input && filenameInput) {
              input.value = $resumeFormData.url;
              filenameInput.value = $resumeFormData.filename;
            }
            console.log({$resumeFormData})
            form.requestSubmit(); // Use the native submit method
          }
        }
      } catch (error) {
        console.error('Error uploading resume:', error);
      }
    }
  }
</script>

<svelte:head>
  <title>Upload Your Resume | DTSS</title>
</svelte:head>

<section class="sm:container grid items-center gap-6 max-w-2xl">
  <Card.Root class="border-0 sm:border shadow-none sm:shadow-sm">
    <Card.Header class="space-y-1">
      <Card.Title class="text-2xl">Add your resume</Card.Title>
      <Card.Description>Upload your most recent resume for employers to view and verify your work skills.</Card.Description>
    </Card.Header>
    <Card.Content>
        <form id="resume-form" use:resumeEnhance method="POST" action="?/resumeUpload" class="mt-6">
          <div class="space-y-2">
            <input type="hidden" name="url" bind:value={$resumeFormData.url}/>
            <input type="hidden" name="filename" bind:value={$resumeFormData.filename}/>
            <FileDropzone onFileDrop={handleResumeUpload} accept={['.pdf', '.doc', '.docx', '.txt']} maxSizeMB={5} />
            {#if $resumeErrors._errors?.length}
              <Alert.Root variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>
                  {$resumeErrors._errors[0]}
                </Alert.Description>
              </Alert.Root>
            {/if}
          </div>
        </form>
    </Card.Content>
  </Card.Root>

</section>
