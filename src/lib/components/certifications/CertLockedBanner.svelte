<script lang="ts">
	/**
	 * "Your RDH shifts are hidden" — the page-level notice on the job lists.
	 *
	 * This is the ONLY way a professional learns why shifts disappeared: per-listing
	 * warnings were deliberately rejected, so the explanation has to live at page
	 * level. It must render even when the list is non-empty — a professional with two
	 * disciplines who lost one still needs telling, and that is the case most likely
	 * to go unnoticed.
	 *
	 * Fed by `certLocked` from the listing endpoints, which only ever contains
	 * genuinely EXPIRED credentials. "No certificate on file yet" is chased separately
	 * and never hides anything, so it must not appear here.
	 */
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle } from 'lucide-svelte';
	import { formatCertDate } from '$lib/certStatus';

	type CertLocked = {
		disciplineId: string;
		disciplineName: string;
		abbreviation: string;
		expiresOn: string;
	};

	export let certLocked: CertLocked[] = [];
	/** Where to send them. Uploading a current certificate is the fix in every case. */
	export let href = '/settings/documents';

	$: names = certLocked.map((c) => `${c.disciplineName} (${c.abbreviation})`);
</script>

{#if certLocked.length > 0}
	<Alert.Root variant="destructive" class="mb-4">
		<AlertCircle class="h-4 w-4" />
		<Alert.Title>
			{names.length === 1
				? `${certLocked[0].abbreviation} shifts are hidden`
				: 'Some shifts are hidden'}
		</Alert.Title>
		<Alert.Description class="space-y-3">
			<div class="space-y-1">
				{#each certLocked as c (c.disciplineId)}
					<p>
						Your <strong>{c.disciplineName} ({c.abbreviation})</strong> certification expired on
						{formatCertDate(c.expiresOn)}.
					</p>
				{/each}
				<p>
					Upload a current certificate to see {names.length === 1 ? 'these' : 'those'} positions
					again. Your other disciplines are unaffected.
				</p>
			</div>
			<Button {href} size="sm" variant="outline">Upload certificate</Button>
		</Alert.Description>
	</Alert.Root>
{/if}
