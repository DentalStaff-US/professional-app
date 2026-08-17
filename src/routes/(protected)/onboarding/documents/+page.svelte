<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import * as Alert from '$lib/components/ui/alert';
  import { AlertCircle, Loader } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { superForm } from 'sveltekit-superforms/client';
  import Button from '$lib/components/ui/button/button.svelte';
  import FileDropzone from '$lib/components/general/file-dropzone.svelte';
  import { CANDIDATE_DOCUMENT_TYPES, CANDIDATE_DOCUMENT_TYPE_LABELS } from '$lib/config/zod-schemas';
  import { tick } from 'svelte';

  export let data: PageData;

  interface FileUploadResult {
      filename: string;
      url: string;
    }

    let partialFailures: {filename: string, error: string}[] = [];

  const skipForm = superForm(data.skipForm);
  const { enhance: skipEnhance, form: skipFormData, submitting: skipSubmitting } = skipForm;


  const docsForm = superForm(data.documentsForm);
  const { enhance: docsEnhance, form: docsFormData, errors: docsErrors } = docsForm;
    async function handleDocumentsUpload(files: File[]) {
        if (files && files.length > 0) {
          // Reset state
          partialFailures = [];

          try {
            console.log(files)
            // Create upload promises for each file
            const uploadPromises = files.map(async (file) => {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('location', 'candidate-documents');

              return fetch('/api/uploadFile', {
                method: 'POST',
                body: formData,
              }).then(async response => {
                if (!response.ok) {
                  throw new Error(`Server responded with ${response.status}`);
                }
                const data = await response.json();
                return {
                  filename: file.name,
                  url: data.url,
                  success: true
                };
              }).catch(error => {
                return {
                  filename: file.name,
                  error: error.message || 'Upload failed',
                  success: false
                };
              });
            });

            // Use Promise.allSettled to handle all uploads, even if some fail
            const results = await Promise.allSettled(uploadPromises);

            // Process results
            const successfulUploads: FileUploadResult[] = [];

            results.forEach((result) => {
              if (result.status === 'fulfilled') {
                const uploadResult = result.value;
                if (uploadResult.success) {
                  successfulUploads.push({
                    filename: uploadResult.filename,
                    url: uploadResult.url
                  });
                } else {
                  partialFailures.push({
                    filename: uploadResult.filename,
                    error: uploadResult.error
                  });
                }
              } else {
                // This would happen if the promise itself rejects before the catch
                partialFailures.push({
                  filename: 'Unknown file',
                  error: result.reason || 'Unknown error'
                });
              }
            });

            // Update form with successful uploads
            if (successfulUploads.length > 0) {
              // Append to existing files if needed
              const existingFiles = $docsFormData.filesData
                ? JSON.parse($docsFormData.filesData as string) as FileUploadResult[]
                : [];

              const updatedFiles = [...existingFiles, ...successfulUploads];
              $docsFormData.filesData = JSON.stringify(updatedFiles);

              // For backward compatibility, also store just the URLs
              $docsFormData.urls = updatedFiles.map(file => file.url);

              await tick();

              // Submit form if we have at least one successful upload
              const form = document.getElementById('documents-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }

              // If some files failed but others succeeded
              if (partialFailures.length > 0 && successfulUploads.length > 0) {
                console.warn(`${successfulUploads.length} files uploaded, ${partialFailures.length} failed`);
              }
            } else if (partialFailures.length > 0) {
              // All uploads failed
              throw new Error('All file uploads failed');
            }
          } catch (error) {
            console.error('Error in documents upload process:', error);
            throw error; // Re-throw to let the FileDropzone component show the error
          }
        }
      }

      // Helper function to get file uploads from form data
      function getFileUploads(formData: any): FileUploadResult[] {
        if (formData.filesData) {
          try {
            return JSON.parse(formData.filesData);
          } catch (e) {
            return [];
          }
        }

        // Single file fallback
        if (formData.fileData) {
          try {
            const singleFile = JSON.parse(formData.fileData);
            return [singleFile];
          } catch (e) {
            return [];
          }
        }

        // Legacy format fallback
        if (formData.url) {
          return [{ filename: 'Uploaded file', url: formData.url }];
        }

        if (formData.urls && Array.isArray(formData.urls)) {
          return formData.urls.map((url, index) => ({
            filename: `File ${index + 1}`,
            url
          }));
        }

        return [];
      }

      $: urlStrings = JSON.stringify($docsFormData.urls || [])
      $: fileStrings = JSON.stringify(getFileUploads($docsFormData));
</script>

<svelte:head>
  <title>Upload Your Documents | DTSS</title>
</svelte:head>

<section class="sm:container grid items-center gap-6 max-w-2xl">
  <Card.Root class="border-0 sm:border shadow-none sm:shadow-sm">
    <Card.Header class="space-y-1">
      <Card.Title class="text-2xl">Upload your work documents</Card.Title>
      <Card.Description>Upload any relevant documents you would need for work and verification such as certifications, licenses, or permits. This is optional but may impact your profile approval process.</Card.Description>
    </Card.Header>
    <Card.Content>
        <form id="documents-form" use:docsEnhance method="POST" action="?/documentsUpload" class="mt-6">
          <div class="space-y-2">
              <input type="hidden" name="urls" bind:value={urlStrings}/>
              <input type="hidden" name="filesData" bind:value={fileStrings}/>
            <div class="space-y-1 mb-4">
              <label for="documentType" class="text-sm font-medium">Document type</label>
              <select
                id="documentType"
                name="documentType"
                bind:value={$docsFormData.documentType}
                class="w-full sm:w-64 border rounded-md px-3 py-2 text-sm bg-white"
              >
                {#each CANDIDATE_DOCUMENT_TYPES as t}
                  <option value={t}>{CANDIDATE_DOCUMENT_TYPE_LABELS[t]}</option>
                {/each}
              </select>
              <p class="text-xs text-muted-foreground">
                Applied to every file you upload here. You can change it later in Settings.
              </p>
            </div>
            <FileDropzone
                  onFileDrop={handleDocumentsUpload}
                  accept={['image/*','.jpg', '.png', '.pdf', '.doc', '.docx', '.txt']}
                  maxSizeMB={10}
                  multiple={true}

                />
            {#if $docsErrors._errors?.length}
              <Alert.Root variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>
                  {$docsErrors._errors[0]}
                </Alert.Description>
              </Alert.Root>
            {/if}
          </div>
        </form>
    </Card.Content>
    <Card.Footer class="flex justify-end">
        <form method="POST" action="?/skipUpload" use:skipEnhance>
            <input type="hidden" name="userId" bind:value={$skipFormData.userId}/>
            <Button type="submit" variant="link" class="w-full sm:w-auto">
                {#if $skipSubmitting}
                    <Loader class="animate-spin h-4 w-4" />
                    Skipping...
                {:else}
                    Skip for now
                {/if}
            </Button>
        </form>
    </Card.Footer>
  </Card.Root>
</section>
