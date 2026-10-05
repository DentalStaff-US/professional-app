<script lang="ts">
	/**
	 * "This document is a credential for one of my disciplines" — the checkbox that
	 * reveals a discipline picker and an expiration date.
	 *
	 * Shown only for LICENSE / CERTIFICATE: an Agreement or Resume with an expiry must
	 * never gate placement, so it must not be linkable.
	 *
	 * The picker lists the professional's OWN Experience & Rates entries, not every
	 * discipline on the platform — a credential can only prove a discipline they
	 * actually hold, and the server rejects anything else.
	 */
	import { credentialBadge } from '$lib/certStatus';
	import { CREDENTIAL_DOCUMENT_TYPES } from '$lib/config/zod-schemas';

	import type { CredentialDiscipline } from './types';

	/** The document type currently chosen in the parent form. */
	export let documentType: string | undefined = undefined;
	/** The professional's Experience & Rates entries. */
	export let disciplines: CredentialDiscipline[] = [];
	/** Bound form values, posted as documentDisciplineId / documentExpiryDate. */
	export let disciplineId = '';
	export let expiryDate = '';
	export let disabled = false;
	/** Today, for the min attribute. Admin forms pass '' to allow past dates. */
	export let minDate: string | undefined = undefined;

	$: isCredentialType =
		!!documentType && (CREDENTIAL_DOCUMENT_TYPES as readonly string[]).includes(documentType);

	// Pre-tick for the case we are actively chasing: they hold exactly one discipline
	// that wants a certificate and has none on file, so the upload they came to make
	// is almost certainly that one.
	$: awaitingCredential = disciplines.filter(
		(d) => d.requiresLicense && !d.effectiveLicenseExpiry
	);
	let checked = false;
	let userToggled = false;
	$: if (!userToggled && isCredentialType && awaitingCredential.length === 1) {
		checked = true;
		if (!disciplineId) disciplineId = awaitingCredential[0].disciplineId;
	}

	// Never submit a half-filled link: unticking clears both fields.
	$: if (!checked || !isCredentialType) {
		disciplineId = '';
		expiryDate = '';
	}

	$: selected = disciplines.find((d) => d.disciplineId === disciplineId);
	$: currentBadge = selected
		? credentialBadge('LICENSE', {
				required: selected.requiresLicense,
				expiresOn: selected.effectiveLicenseExpiry,
				graceStartedOn: selected.licenseGraceStartedOn
			})
		: null;

	function onToggle(e: Event) {
		userToggled = true;
		checked = (e.target as HTMLInputElement).checked;
	}
</script>

{#if isCredentialType && disciplines.length > 0}
	<div class="space-y-3 rounded-md border bg-gray-50/60 p-3">
		<label class="flex items-start gap-2 text-sm font-medium">
			<input
				type="checkbox"
				class="mt-0.5 h-4 w-4 rounded border-gray-300"
				{disabled}
				{checked}
				on:change={onToggle}
			/>
			<span>This is a license, registration or certificate for one of my disciplines</span>
		</label>

		{#if checked}
			<div class="space-y-3 pl-6">
				<div class="space-y-1">
					<label class="text-xs font-medium text-gray-700" for="credential-discipline">
						Applies to
					</label>
					<select
						id="credential-discipline"
						name="documentDisciplineId"
						class="w-full rounded-md border-gray-300 text-sm"
						bind:value={disciplineId}
						{disabled}
						required
					>
						<option value="">Select a discipline…</option>
						{#each disciplines as d (d.disciplineId)}
							<option value={d.disciplineId}>
								{d.name} ({d.abbreviation}){d.requiresLicense && !d.effectiveLicenseExpiry
									? ' — license/registration needed'
									: ''}
							</option>
						{/each}
					</select>
					{#if currentBadge}
						<p class="text-xs text-gray-600">
							Currently: <span class="font-medium">{currentBadge.label}</span>
						</p>
					{:else if selected && !selected.requiresLicense}
						<p class="text-xs text-gray-600">
							This discipline does not require a license or registration, so nothing will be hidden if this
							one expires.
						</p>
					{/if}
				</div>

				<!-- Optional. A dental license is held until revoked rather than expiring,
				     and a certificate attached here is supporting evidence — the date that
				     governs a certification lives on the Experience & Rates entry. Making
				     this required blocked people from filing a perfectly valid document. -->
				<div class="space-y-1">
					<label class="text-xs font-medium text-gray-700" for="credential-expiry">
						Expires on <span class="font-normal text-gray-500">(if it has an expiry)</span>
					</label>
					<input
						id="credential-expiry"
						name="documentExpiryDate"
						type="date"
						class="w-full rounded-md border-gray-300 text-sm"
						bind:value={expiryDate}
						min={minDate}
						{disabled}
					/>
					<p class="text-xs text-gray-600">
						Leave blank if this document does not expire.
					</p>
				</div>
			</div>
		{/if}
	</div>
{/if}
