<script lang="ts">
	/**
	 * The one thing an APPROVED professional may do on the Experience & Rates page.
	 *
	 * Everything about the entry itself — discipline, experience level, rates — stays
	 * read-only after approval. This slot only attaches or replaces the CREDENTIAL for
	 * the entry, and it does so by writing to `candidate_document_uploads` alone:
	 * neither action posts to `updateCandidateExperience`, so the read-only rule holds
	 * structurally rather than by convention. There is no code path from here to
	 * `candidate_discipline_experience`.
	 *
	 * Two ways in, because the legacy population matters:
	 *   - "Select an uploaded document" designates a file they already have. Uploads
	 *     used to be forced to type OTHER, so hundreds of working professionals have a
	 *     certificate on file that the system does not recognise as one. They must not
	 *     have to re-upload it.
	 *   - "Upload new" is the ordinary renewal path.
	 *
	 * There is deliberately no "Remove" — un-linking would be how someone cleared their
	 * own gate. Replacing with a newer certificate is the supported move, and the old
	 * one stays on file as the audit trail.
	 */
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Upload, AlertCircle } from 'lucide-svelte';
	import { credentialBadge, credentialState, formatCertDate, todayInET } from '$lib/certStatus';

	type DocOption = {
		id: string;
		filename: string | null;
		type: string;
		expiryDate: string | null;
		disciplineId: string | null;
		locked?: boolean;
		adminOnly?: boolean;
	};

	export let disciplineId: string;
	export let disciplineName: string;
	export let abbreviation: string;
	/** Which credential this slot manages. See the docstring. */
	export let kind: 'LICENSE' | 'CERTIFICATION' = 'LICENSE';
	export let required = false;
	/** MAX(expiry_date) across credentials linked to this entry. */
	export let effectiveExpiry: string | null = null;
	/** Every document the professional has, for the "select an existing one" path. */
	export let documents: DocOption[] = [];
	/** Upload handler supplied by the page (posts to /api/uploadFile). */
	export let onUploadFile: ((file: File) => Promise<{ url: string; filename: string } | null>) | null =
		null;

	/** LICENSE only: when the 30-day missing-license clock started. */
	export let graceStartedOn: string | null = null;

	$: input = { required, expiresOn: effectiveExpiry, graceStartedOn };
	$: badge = credentialBadge(kind, input);
	$: state = credentialState(input);
	$: isLicense = kind === 'LICENSE';
	$: noun = isLicense ? 'license' : 'certification';

	// The credential currently backing this entry, if any.
	$: linked = documents
		.filter((d) => d.disciplineId === disciplineId && d.expiryDate)
		.sort((a, b) => String(b.expiryDate).localeCompare(String(a.expiryDate)))[0];

	// Candidates for designation: anything not already backing THIS entry, and not
	// admin-pinned (the server refuses those regardless).
	$: selectable = documents.filter(
		(d) => d.disciplineId !== disciplineId && !d.locked && !d.adminOnly
	);

	let mode: 'idle' | 'select' | 'upload' = 'idle';
	let chosenDocumentId = '';
	let expiry = '';
	let uploading = false;
	let uploadError = '';
	let uploadedUrl = '';
	let uploadedName = '';

	async function handleFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !onUploadFile) return;
		uploading = true;
		uploadError = '';
		try {
			const res = await onUploadFile(file);
			if (!res) {
				uploadError = 'Upload failed. Please try again.';
				return;
			}
			uploadedUrl = res.url;
			uploadedName = res.filename;
		} finally {
			uploading = false;
		}
	}
</script>

<div class="mt-3 rounded-md border bg-gray-50/60 p-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2 text-sm">
			{#if state === 'MISSING' || state === 'EXPIRED'}
				<AlertCircle class="h-4 w-4 text-red-600" />
			{:else}
				<FileText class="h-4 w-4 text-gray-500" />
			{/if}
			<span class="font-medium">{isLicense ? 'License' : 'Certification'}</span>
			{#if badge}
				<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {badge.class}">
					{badge.label}
				</span>
			{:else}
				<span class="text-xs text-gray-600">
					No {noun} required for {disciplineName}
				</span>
			{/if}
		</div>

		{#if required}
			<div class="flex gap-2">
				<Button
					size="sm"
					variant="outline"
					on:click={() => (mode = mode === 'select' ? 'idle' : 'select')}
					disabled={selectable.length === 0}
				>
					Select an uploaded document
				</Button>
				{#if onUploadFile}
					<Button
						size="sm"
						variant={state === 'EXPIRED' || state === 'MISSING' ? 'default' : 'outline'}
						on:click={() => (mode = mode === 'upload' ? 'idle' : 'upload')}
					>
						{linked ? 'Replace' : 'Upload new'}
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if linked}
		<p class="mt-2 text-xs text-gray-600">
			On file: <span class="font-medium">{linked.filename ?? 'certificate'}</span> · expires
			{formatCertDate(linked.expiryDate)}
		</p>
	{/if}

	{#if !isLicense}
		<!-- Certifications have no document of their own: the date on the Experience &
		     Rates entry IS the record, and a CERTIFICATE upload is optional evidence. -->
		<form
			method="POST"
			action="?/setCertificationExpiry"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
				};
			}}
			class="mt-3 space-y-2 border-t pt-3"
		>
			<input type="hidden" name="disciplineId" value={disciplineId} />
			<div class="space-y-1">
				<label class="text-xs font-medium text-gray-700" for="cert-exp-{disciplineId}">
					{required ? 'Expires on' : 'Does your state require a certification for this discipline?'}
				</label>
				{#if !required}
					<p class="text-xs text-gray-600">
						If it does, add its expiration date below. <strong
							>Once added, only DTSS staff can remove it</strong
						> — contact support if you add it by mistake.
					</p>
				{/if}
				<input
					id="cert-exp-{disciplineId}"
					name="expiryDate"
					type="date"
					class="w-full rounded-md border-gray-300 text-sm"
					min={todayInET()}
					bind:value={expiry}
					required
				/>
			</div>
			{#if required}
				<p class="text-xs text-gray-600">
					If this date passes without a renewal, {abbreviation} jobs will be hidden until you update
					it.
				</p>
			{/if}
			<Button type="submit" size="sm" disabled={!expiry}>
				{required ? 'Update expiration' : 'Add certification'}
			</Button>
		</form>
	{/if}

	{#if required && isLicense && mode === 'select'}
		<!-- Designation: sets type + link + expiry in one atomic write, which is the
		     only way the approval freeze permits touching `type`. -->
		<form
			method="POST"
			action="?/designateCredential"
			use:enhance={() => {
				// Returning a callback overrides enhance's default handling, so call
				// update() to keep the invalidation + flash behaviour.
				return async ({ update }) => {
					mode = 'idle';
					await update();
				};
			}}
			class="mt-3 space-y-2 border-t pt-3"
		>
			<input type="hidden" name="disciplineId" value={disciplineId} />
			<div class="space-y-1">
				<label class="text-xs font-medium text-gray-700" for="sel-{disciplineId}">
					Which document is your {disciplineName} ({abbreviation}) certificate?
				</label>
				<select
					id="sel-{disciplineId}"
					name="documentId"
					class="w-full rounded-md border-gray-300 text-sm"
					bind:value={chosenDocumentId}
					required
				>
					<option value="">Select a document…</option>
					{#each selectable as d (d.id)}
						<option value={d.id}>{d.filename ?? d.id} ({d.type})</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label class="text-xs font-medium text-gray-700" for="sel-exp-{disciplineId}">
					Expires on
				</label>
				<input
					id="sel-exp-{disciplineId}"
					name="expiryDate"
					type="date"
					class="w-full rounded-md border-gray-300 text-sm"
					bind:value={expiry}
					required
				/>
			</div>
			<p class="text-xs text-gray-600">
				If this date passes without a newer certificate, {abbreviation} jobs will be hidden until
				you renew.
			</p>
			<Button type="submit" size="sm" disabled={!chosenDocumentId || !expiry}>
				Use as {abbreviation} certificate
			</Button>
		</form>
	{/if}

	{#if required && isLicense && mode === 'upload' && onUploadFile}
		<form
			method="POST"
			action="?/uploadCredential"
			use:enhance={() => {
				return async ({ update }) => {
					mode = 'idle';
					uploadedUrl = '';
					uploadedName = '';
					await update();
				};
			}}
			class="mt-3 space-y-2 border-t pt-3"
		>
			<input type="hidden" name="disciplineId" value={disciplineId} />
			<input type="hidden" name="url" value={uploadedUrl} />
			<input type="hidden" name="filename" value={uploadedName} />
			<div class="space-y-1">
				<label class="text-xs font-medium text-gray-700" for="up-{disciplineId}">
					Certificate file
				</label>
				<input
					id="up-{disciplineId}"
					type="file"
					accept="image/*,.jpg,.png,.pdf,.doc,.docx"
					class="w-full text-sm"
					on:change={handleFile}
				/>
				{#if uploading}
					<p class="text-xs text-gray-600">Uploading…</p>
				{:else if uploadedName}
					<p class="text-xs text-green-700">Ready: {uploadedName}</p>
				{/if}
				{#if uploadError}
					<p class="text-xs text-red-600">{uploadError}</p>
				{/if}
			</div>
			<div class="space-y-1">
				<label class="text-xs font-medium text-gray-700" for="up-exp-{disciplineId}">
					Expires on
				</label>
				<input
					id="up-exp-{disciplineId}"
					name="expiryDate"
					type="date"
					class="w-full rounded-md border-gray-300 text-sm"
					min={todayInET()}
					bind:value={expiry}
					required
				/>
			</div>
			<Button type="submit" size="sm" disabled={!uploadedUrl || !expiry || uploading}>
				Save certificate
			</Button>
		</form>
	{/if}
</div>
