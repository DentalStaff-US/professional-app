<script lang="ts">
	/**
	 * "Your RDH shifts are hidden" — the page-level notice on the job lists.
	 *
	 * The ONLY way a professional learns why shifts disappeared: per-listing warnings
	 * were deliberately rejected, so the explanation lives at page level. It must
	 * render even when the list is non-empty — a professional with two disciplines who
	 * lost one still needs telling, and that is the case most likely to go unnoticed.
	 *
	 * Names the credential that actually lapsed, and sends them to the right place:
	 * a LICENSE is fixed by uploading a document, a CERTIFICATION by updating a date
	 * on the Experience & Rates entry. Sending someone to the wrong page at the moment
	 * their work disappears is the worst possible dead end.
	 */
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle } from 'lucide-svelte';
	import { formatCertDate } from '$lib/certStatus';

	type Blocker = { track: 'LICENSE' | 'CERTIFICATION'; expiresOn: string | null };
	type CertLocked = {
		disciplineId: string;
		disciplineName: string;
		abbreviation: string;
		blockedBy?: Blocker[];
		/** Pre-split shape. Kept so this app can deploy ahead of the admin app. */
		expiresOn?: string | null;
	};

	export let certLocked: CertLocked[] = [];

	/**
	 * The admin app is deployed separately, so this component may run against either
	 * shape for a short window. Falling back to a LICENSE blocker is right: before the
	 * split every gated credential came from a document, which is the license track.
	 */
	const blockersOf = (c: CertLocked): Blocker[] =>
		c.blockedBy ?? [{ track: 'LICENSE', expiresOn: c.expiresOn ?? null }];

	$: anyLicense = certLocked.some((c) => blockersOf(c).some((b) => b.track === 'LICENSE'));
	$: anyCert = certLocked.some((c) => blockersOf(c).some((b) => b.track === 'CERTIFICATION'));
	// Licenses are fixed in Documents, certifications on the Experience page. When
	// both are lapsed, Documents is the better landing spot — it is the slower of the
	// two to resolve.
	$: href = anyLicense ? '/settings/documents' : '/settings/experience';
	$: ctaLabel = anyLicense ? 'Upload your license/registration' : 'Upload your certificate';
	$: names = certLocked.map((c) => `${c.disciplineName} (${c.abbreviation})`);

	const noun = (t: Blocker['track']) => (t === 'LICENSE' ? 'license' : 'certification');
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
					{#each blockersOf(c) as b}
						<p>
							Your <strong>{c.disciplineName} ({c.abbreviation})</strong>
							{noun(b.track)}
							{#if b.expiresOn}
								expired on {formatCertDate(b.expiresOn)}.
							{:else}
								is still outstanding.
							{/if}
						</p>
					{/each}
				{/each}
				<p>
					{#if anyLicense && anyCert}
						Upload a current license/registration and a current certificate to see
					{:else if anyLicense}
						Upload a current license or registration to see
					{:else}
						Update its expiration date to see
					{/if}
					{names.length === 1 ? 'these' : 'those'} positions again. Your other disciplines are unaffected.
				</p>
			</div>
			<Button {href} size="sm" variant="outline">{ctaLabel}</Button>
		</Alert.Description>
	</Alert.Root>
{/if}
