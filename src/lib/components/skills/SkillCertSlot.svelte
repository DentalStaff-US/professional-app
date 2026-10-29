<script lang="ts">
	/**
	 * Certificate for ONE skill that needs one (e.g. CPR/BLS). Upload-only, like the
	 * discipline certificate slot: renewal is a new upload, the newest expiry wins,
	 * and there is no "remove". Allowed after approval — it writes a document row,
	 * never the skill list.
	 */
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { todayInET } from '$lib/certStatus';

	export let skillId: string;
	export let skillName: string;
	/** Newest linked certificate expiry, 'YYYY-MM-DD', or null. */
	export let certExpiresOn: string | null = null;
	/** True while that certificate is unexpired. */
	export let effective = false;
	export let onUploadFile: (file: File) => Promise<{ url: string; filename: string } | null>;

	let open = false;
	let uploading = false;
	let uploadError = '';
	let uploadedUrl = '';
	let uploadedName = '';
	let expiry = '';

	$: status = !certExpiresOn
		? { text: 'Certificate needed — this skill won’t count for matching until you add one.', tone: 'text-amber-700' }
		: !effective
			? { text: `Certificate expired ${certExpiresOn} — upload your renewal.`, tone: 'text-red-600' }
			: { text: `Certificate on file, expires ${certExpiresOn}.`, tone: 'text-green-700' };

	async function handleFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		uploading = true;
		uploadError = '';
		const result = await onUploadFile(file);
		uploading = false;
		if (!result) {
			uploadError = 'Upload failed. Please try again.';
			return;
		}
		uploadedUrl = result.url;
		uploadedName = result.filename;
	}
</script>

<div class="mt-2 rounded-md border bg-gray-50 p-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<p class="text-xs {status.tone}">{skillName}: {status.text}</p>
		{#if !open}
			<Button type="button" size="sm" variant="outline" on:click={() => (open = true)}>
				{certExpiresOn ? 'Upload renewal' : 'Upload certificate'}
			</Button>
		{/if}
	</div>

	{#if open}
		<form
			method="POST"
			action="?/uploadSkillCertificate"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						open = false;
						uploadedUrl = '';
						uploadedName = '';
						expiry = '';
					}
					await update();
				};
			}}
			class="mt-3 space-y-2 border-t pt-3"
		>
			<input type="hidden" name="skillId" value={skillId} />
			<input type="hidden" name="url" value={uploadedUrl} />
			<input type="hidden" name="filename" value={uploadedName} />
			<div class="space-y-1">
				<label class="text-xs font-medium text-gray-700" for="skill-up-{skillId}">Certificate file</label>
				<input
					id="skill-up-{skillId}"
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
				<label class="text-xs font-medium text-gray-700" for="skill-exp-{skillId}">Expires on</label>
				<input
					id="skill-exp-{skillId}"
					name="expiryDate"
					type="date"
					class="w-full rounded-md border-gray-300 text-sm"
					min={todayInET()}
					bind:value={expiry}
					required
				/>
			</div>
			<div class="flex gap-2">
				<Button type="submit" size="sm" disabled={!uploadedUrl || !expiry || uploading}>
					Save certificate
				</Button>
				<Button type="button" size="sm" variant="ghost" on:click={() => (open = false)}>Cancel</Button>
			</div>
		</form>
	{/if}
</div>
