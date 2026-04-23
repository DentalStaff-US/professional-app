<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { FileText, Trash2, Download, MoreHorizontal } from 'lucide-svelte';
	import FileDropzone from '$lib/components/general/file-dropzone.svelte';
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Alert from '$lib/components/ui/alert';
	import { AlertCircle } from 'lucide-svelte';
	import { tick } from 'svelte';

	interface FileUploadResult {
		filename: string;
		url: string;
	}

	export let data: PageData;
	let partialFailures: { filename: string; error: string }[] = [];

	$: userDocuments = data.documents;

	const docsForm = superForm(data.documentsForm);
	const { enhance: docsEnhance, form: docsFormData, errors: docsErrors } = docsForm;

	// Helper function to format date
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	// Detect file type icon
	function getFileIcon(filename: string) {
		const extension = filename?.split('.').pop()?.toLowerCase() || '';

		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
			return 'image';
		} else if (['pdf'].includes(extension)) {
			return 'pdf';
		} else if (['doc', 'docx'].includes(extension)) {
			return 'word';
		} else {
			return 'generic';
		}
	}

	// Handle document deletion
	function handleDeleteDocument(documentId: string) {
		console.log(`Deleting document ${documentId}`);
		// Here you would normally delete the file from your server
		// and update the documents list afterward
	}

	async function handleDocumentsUpload(files: File[]) {
		if (files && files.length > 0) {
			// Reset state
			partialFailures = [];

			try {
				console.log(files);
				// Create upload promises for each file
				const uploadPromises = files.map(async (file) => {
					const formData = new FormData();
					formData.append('file', file);
					formData.append('location', 'candidate-documents');

					return fetch('/api/uploadFile', {
						method: 'POST',
						body: formData
					})
						.then(async (response) => {
							if (!response.ok) {
								throw new Error(`Server responded with ${response.status}`);
							}
							const data = await response.json();
							return {
								filename: file.name,
								url: data.url,
								success: true
							};
						})
						.catch((error) => {
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
						? (JSON.parse(JSON.stringify($docsFormData.filesData as string)) as FileUploadResult[])
						: [];

					const updatedFiles = [...existingFiles, ...successfulUploads];
					$docsFormData.filesData = JSON.stringify(updatedFiles);

					// For backward compatibility, also store just the URLs
					$docsFormData.urls = updatedFiles.map((file) => file.url);

					await tick();

					// Submit form if we have at least one successful upload
					const form = document.getElementById('documents-form') as HTMLFormElement;
					if (form) {
						form.requestSubmit();
					}

					// If some files failed but others succeeded
					if (partialFailures.length > 0 && successfulUploads.length > 0) {
						console.warn(
							`${successfulUploads.length} files uploaded, ${partialFailures.length} failed`
						);
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
			return formData.urls.map((url: string, index: number) => ({
				filename: `File ${index + 1}`,
				url
			}));
		}

		return [];
	}

	$: urlStrings = JSON.stringify($docsFormData.urls || []);
	$: fileStrings = JSON.stringify(getFileUploads($docsFormData));
</script>

<svelte:head>
	<title>Settings - My Documents | DentalStaff.US</title>
</svelte:head>

<section class="sm:container mx-auto px-4 py-6 space-y-8">
	<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">Your Documents</h1>

	<!-- Document Management Section -->
	<Card>
		<CardHeader>
			<div class="flex justify-between items-start flex-wrap gap-4">
				<div>
					<CardTitle>Document Management</CardTitle>
					<CardDescription>Store and manage your professional documents</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b">
							<th class="text-left py-3 px-4 font-medium">Document</th>
							<th class="text-left py-3 px-4 font-medium">Uploaded</th>
							<th class="text-right py-3 px-4 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each userDocuments as doc}
							<tr class="border-b hover:bg-gray-50">
								<td class="py-3 px-4">
									<div class="flex items-center gap-2">
										{#if getFileIcon(doc?.filename) === 'image'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5 text-blue-600"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
												<circle cx="8.5" cy="8.5" r="1.5" />
												<polyline points="21 15 16 10 5 21" />
											</svg>
										{:else if getFileIcon(doc?.filename) === 'pdf'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5 text-red-600"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
												<polyline points="14 2 14 8 20 8" />
												<path d="M9 15v-2" />
												<path d="M12 15v-4" />
												<path d="M15 15v-6" />
											</svg>
										{:else}
											<FileText class="h-5 w-5 text-blue-600" />
										{/if}
										<span class="font-medium">{doc?.filename}</span>
									</div>
								</td>
								<td class="py-3 px-4 text-sm">{formatDate(doc.createdAt)}</td>
								<td class="py-3 px-4 text-right">
									<DropdownMenu>
										<DropdownMenuTrigger>
											<Button variant="ghost" size="icon">
												<MoreHorizontal class="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem>
												<a class="flex" href={doc.uploadUrl}
													><Download class="h-4 w-4 mr-2" />
													<span>Download</span></a
												>
											</DropdownMenuItem>
											<DropdownMenuItem
												class="text-red-500 focus:text-red-500"
												on:click={() => handleDeleteDocument(doc.id)}
											>
												<Trash2 class="h-4 w-4 mr-2" />
												<span>Delete</span>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</CardContent>
	</Card>

	<!-- Upload Section -->
	<Card>
		<CardHeader>
			<CardTitle>Upload Document</CardTitle>
			<CardDescription>Upload important documents for your profile</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				<form
					id="documents-form"
					use:docsEnhance
					method="POST"
					action="?/documentsUpload"
					class="mt-6"
				>
					<div class="space-y-2">
						<input type="hidden" name="urls" bind:value={urlStrings} />
						<input type="hidden" name="filesData" bind:value={fileStrings} />
						<FileDropzone
							onFileDrop={handleDocumentsUpload}
							accept={['image/*', '.jpg', '.png', '.pdf', '.doc', '.docx', '.txt']}
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
				<Separator />
				<div class="space-y-2">
					<h3 class="text-sm font-medium">File Requirements</h3>
					<ul class="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
						<li>Files must be in PDF, JPG, or PNG format</li>
						<li>Maximum file size is 5MB</li>
						<li>Documents must be clearly legible</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
</section>
