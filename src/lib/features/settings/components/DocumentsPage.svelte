<script lang="ts">
	import { enhance } from '$app/forms';
	import { Download, FileText, Lock, Trash2 } from 'lucide-svelte';
	import ConfirmDialog from '$dtss/ConfirmDialog.svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { DocumentUploadForm, toCredentialDisciplines } from '$features/profile';
	import { credentialBadge, formatCertDate } from '$lib/certStatus';
	import { Button } from '$lib/components/ui/button';
	import { CANDIDATE_DOCUMENT_TYPES, CANDIDATE_DOCUMENT_TYPE_LABELS, CREDENTIAL_DOCUMENT_TYPES } from '$lib/config/zod-schemas';

	type Doc = {
		id: string;
		filename: string | null;
		type: string;
		uploadUrl: string;
		createdAt: string;
		expiryDate?: string | null;
		disciplineId?: string | null;
		disciplineName?: string | null;
		disciplineAbbreviation?: string | null;
		locked?: boolean;
		adminOnly?: boolean;
	};

	let {
		documents,
		documentsForm,
		disciplines: rawDisciplines,
		editable,
		canEditCredentialMetadata
	}: {
		documents: Doc[];
		documentsForm: any;
		disciplines: any[];
		editable: boolean;
		canEditCredentialMetadata: boolean;
	} = $props();

	const disciplines = $derived(toCredentialDisciplines(rawDisciplines));

	let deleting = $state<Doc | null>(null);
	let confirmOpen = $state(false);

	/**
	 * Mirrors `assertCandidateDocumentEditable` on the server: an approved
	 * account freezes every document, and an admin can lock an individual one.
	 * The server is still the authority — this only decides whether we offer the
	 * control, so the user isn't handed a button that will be refused.
	 */
	const canEdit = (doc: Doc) => editable && !doc.locked && !doc.adminOnly;

	/**
	 * Credential metadata — the expiry date and which discipline a certificate proves —
	 * stays correctable after approval. The gate keys off both, so refusing to let
	 * someone fix a mistyped date while their job visibility depends on it would be
	 * indefensible. An admin pin (`locked`/`adminOnly`) still wins, matching the server.
	 */
	const canEditCredential = (doc: Doc) => canEditCredentialMetadata && !doc.locked && !doc.adminOnly;

	const isCredential = (type: string) => (CREDENTIAL_DOCUMENT_TYPES as readonly string[]).includes(type);
	const typeLabel = (type: string) => CANDIDATE_DOCUMENT_TYPE_LABELS[type as keyof typeof CANDIDATE_DOCUMENT_TYPE_LABELS] ?? type;
	const expiryDay = (value: string | null | undefined) => (value ? String(value).slice(0, 10) : '');
	const uploadedOn = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

	/**
	 * Per-row badge. A document's own expiry is shown relative to whether the
	 * discipline it is linked to actually requires one — an expiry on an unlinked file,
	 * or on a discipline needing no credential, gates nothing and shouldn't look alarming.
	 */
	function badge(doc: Doc) {
		if (!doc.expiryDate) return null;
		const linked = disciplines.find((d) => d.disciplineId === doc.disciplineId);
		// Judged against the LICENSE track: a certification's date lives on the
		// Experience & Rates entry, not on a document.
		return credentialBadge('LICENSE', { required: Boolean(linked?.requiresLicense), expiresOn: expiryDay(doc.expiryDate) });
	}

	function askDelete(doc: Doc) {
		deleting = doc;
		confirmOpen = true;
	}

	const submitOnChange = (event: Event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit();
	const select =
		'mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
	const label = 'text-sm font-semibold text-muted-foreground';
</script>

<svelte:head><title>Documents | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Documents" description="Your licenses, certifications and other files." />

	{#if !editable}
		<Notice tone="info" title="Your documents are locked">
			Your account is approved, so these can't be changed here. You can still add a renewal below. Contact support if anything else needs updating.
		</Notice>
	{/if}

	{#if documents.length}
		<ul class="grid gap-4 lg:grid-cols-2">
			{#each documents as doc (doc.id)}
				{@const docBadge = badge(doc)}
				<li class="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-card">
					<div class="flex items-start gap-3">
						{#if doc.adminOnly || doc.locked}
							<Lock class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Locked" />
						{:else}
							<FileText class="mt-0.5 size-5 shrink-0 text-primary-dark" aria-hidden="true" />
						{/if}
						<div class="min-w-0">
							<h2 class="break-words font-bold">{doc.filename ?? 'Untitled file'}</h2>
							<p class="text-sm text-muted-foreground">Uploaded {uploadedOn(doc.createdAt)}</p>
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							{#if canEdit(doc)}
								<!-- Auto-submitting select: retyping is a single interaction,
								     so there's no separate save button to forget. -->
								<form method="POST" action="?/updateDocument" use:enhance>
									<input type="hidden" name="documentId" value={doc.id} />
									<label class={label} for={`type-${doc.id}`}>Type</label>
									<select id={`type-${doc.id}`} name="type" class={select} value={doc.type} onchange={submitOnChange}>
										{#each CANDIDATE_DOCUMENT_TYPES as type (type)}
											<option value={type}>{CANDIDATE_DOCUMENT_TYPE_LABELS[type]}</option>
										{/each}
									</select>
								</form>
							{:else}
								<p class={label}>Type</p>
								<p class="mt-1">{typeLabel(doc.type)}</p>
							{/if}
						</div>

						<!-- Which Experience & Rates entry this credential proves. -->
						{#if isCredential(doc.type)}
							<div>
								{#if canEditCredential(doc) && disciplines.length}
									<form method="POST" action="?/updateDocument" use:enhance>
										<input type="hidden" name="documentId" value={doc.id} />
										<!-- Designating a document as a credential also sets its type,
										     which the approval freeze otherwise refuses. Legacy uploads
										     were all forced to OTHER, so this is the no-re-upload path. -->
										<input type="hidden" name="intent" value="DESIGNATE_CREDENTIAL" />
										<label class={label} for={`discipline-${doc.id}`}>Applies to</label>
										<select id={`discipline-${doc.id}`} name="disciplineId" class={select} value={doc.disciplineId ?? ''} onchange={submitOnChange}>
											<option value="">Not a credential</option>
											{#each disciplines as discipline (discipline.disciplineId)}
												<option value={discipline.disciplineId}>{discipline.abbreviation}</option>
											{/each}
										</select>
									</form>
								{:else}
									<p class={label}>Applies to</p>
									<p class="mt-1">{doc.disciplineAbbreviation ?? doc.disciplineName ?? 'Not linked'}</p>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Read-only, deliberately. The date is captured once, at upload, together
					     with the document it came from. Editing it afterwards lets the file say
					     one thing and the record another. To correct it, upload again or ask DTSS. -->
					{#if isCredential(doc.type) && doc.expiryDate}
						<p class="flex flex-wrap items-center gap-2 text-sm">
							<span><span class="font-semibold">Expires</span> {formatCertDate(expiryDay(doc.expiryDate))}</span>
							{#if docBadge}<span class={`rounded-full px-2 py-0.5 text-xs font-bold ${docBadge.class}`}>{docBadge.label}</span>{/if}
						</p>
					{/if}

					<div class="mt-auto flex flex-wrap gap-2">
						<Button href={doc.uploadUrl} target="_blank" rel="noopener" variant="outline" class="min-h-11 flex-1 sm:flex-none">
							<Download class="mr-2 size-4" aria-hidden="true" /> Download
						</Button>
						{#if canEdit(doc)}
							<Button type="button" variant="ghost" class="min-h-11 flex-1 text-destructive hover:text-destructive sm:flex-none" on:click={() => askDelete(doc)}>
								<Trash2 class="mr-2 size-4" aria-hidden="true" /> Delete
							</Button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState icon={FileText} title="No documents yet" description="Add your licenses, certifications and other files below." />
	{/if}

	<section aria-labelledby="add-heading" class="space-y-3">
		<h2 id="add-heading" class="text-h3">Add a document</h2>
		<DocumentUploadForm form={documentsForm} {disciplines} />
	</section>
</Page>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete this document?"
	description={`${deleting?.filename ?? 'This file'} will be removed from your profile. This can't be undone.`}
>
	{#snippet confirm()}
		<form
			method="POST"
			action="?/deleteDocument"
			use:enhance={() => {
				confirmOpen = false;
				return ({ update }) => update();
			}}
		>
			<input type="hidden" name="documentId" value={deleting?.id ?? ''} />
			<Button type="submit" variant="destructive" class="min-h-11 w-full sm:min-h-10">Delete document</Button>
		</form>
	{/snippet}
</ConfirmDialog>
