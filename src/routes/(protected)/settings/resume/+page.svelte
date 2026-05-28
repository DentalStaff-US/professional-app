<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import * as Alert from "$lib/components/ui/alert";
  import { FileText, Upload, Download, Clock, CheckCircle, AlertCircle } from "lucide-svelte";
  import FileDropzone from "$lib/components/general/file-dropzone.svelte";
	import { tick } from "svelte";
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from "./$types";

	export let data: PageData
	$: resume = data.resume

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


  // Helper function to format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  }

  // Handle resume download
  function handleDownloadResume() {
    if (!resume || !resume.uploadUrl) return;

    // In a real app, this would download the file from resume.fileUrl
    console.log("Downloading resume");
    window.open(resume.uploadUrl, '_blank');
  }
</script>

<svelte:head>
  <title>Settings - Manage Resume | DTSS</title>
</svelte:head>

<section class="sm:container mx-auto px-4 py-6 space-y-8">
  <h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
    Resume
  </h1>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Current Resume Section -->
    <div class="md:col-span-2">
      <Card class="h-full">
        <CardHeader>
          <CardTitle>Current Resume</CardTitle>
          <CardDescription>
            Your most recent resume on file
          </CardDescription>
        </CardHeader>
        <CardContent>
          {#if !resume}
            <div class="flex flex-col items-center justify-center py-10 text-center">
              <FileText class="h-14 w-14 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium mb-2">No Resume Uploaded</h3>
              <p class="text-sm text-muted-foreground max-w-sm">
                Upload your resume to help employers learn about your experience and qualifications.
              </p>
            </div>
          {:else}
            <div class="bg-gray-50 border rounded-lg p-6">
              <div class="flex items-start gap-4">
                <div class="bg-blue-100 p-3 rounded-lg">
                  <FileText class="h-8 w-8 text-blue-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium truncate">{resume.filename}</h3>
                  <div class="mt-1 space-y-1">
                    <p class="text-sm text-muted-foreground">
                      Uploaded: {formatDate(resume.createdAt)}
                    </p>
                  </div>
                  <div class="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      on:click={handleDownloadResume}
                    >
                      <Download class="h-4 w-4 mr-2" />
                      Download Resume
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Alert.Root class="mt-6">
              <CheckCircle class="h-4 w-4" />
              <Alert.Description>
                Your resume is current. You can update it at any time by uploading a new file.
              </Alert.Description>
            </Alert.Root>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- Upload Section -->
    <div class="md:col-span-1">
      <Card class="h-full">
        <CardHeader>
          <CardTitle>{resume ? 'Update Resume' : 'Upload Resume'}</CardTitle>
          <CardDescription>
            {resume ? 'Replace your current resume with a new version' : 'Upload your professional resume'}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

          <div class="mt-6 space-y-4">
            <div class="space-y-2">
              <h4 class="text-sm font-medium">Supported Formats</h4>
              <div class="flex flex-wrap gap-2">
                <div class="px-3 py-1 bg-gray-100 rounded-md text-xs">PDF</div>
                <div class="px-3 py-1 bg-gray-100 rounded-md text-xs">DOC</div>
                <div class="px-3 py-1 bg-gray-100 rounded-md text-xs">DOCX</div>
              </div>
            </div>

            <p class="text-xs text-muted-foreground">
              Max file size: 5MB
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <p class="text-xs text-muted-foreground">
            {resume ? 'Uploading a new resume will replace your current one.' : 'Your resume will be visible to potential employers.'}
          </p>
        </CardFooter>
      </Card>
    </div>
  </div>

  <!-- Resume Tips -->
  <Card>
    <CardHeader>
      <CardTitle>Resume Tips</CardTitle>
      <CardDescription>
        Optimize your resume for dental industry positions
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="space-y-2">
          <h3 class="text-base font-medium flex items-center gap-2">
            <CheckCircle class="h-5 w-5 text-green-500" />
            <span>Keep It Relevant</span>
          </h3>
          <p class="text-sm text-muted-foreground">
            Focus on dental experience, skills, and certifications that match the positions you're applying for.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-medium flex items-center gap-2">
            <CheckCircle class="h-5 w-5 text-green-500" />
            <span>Highlight Certifications</span>
          </h3>
          <p class="text-sm text-muted-foreground">
            Prominently feature your dental certifications, continuing education, and specialized training.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-medium flex items-center gap-2">
            <CheckCircle class="h-5 w-5 text-green-500" />
            <span>Be Specific</span>
          </h3>
          <p class="text-sm text-muted-foreground">
            Include specific technologies, equipment, and procedures you're experienced with in the dental field.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</section>
