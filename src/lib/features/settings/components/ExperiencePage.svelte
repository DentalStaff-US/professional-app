<script lang="ts">
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { ExperienceForm, uploadFile } from '$features/profile';
	import { sortLevels } from '$features/profile/experience';
	import CredentialSlot from '$lib/components/certifications/CredentialSlot.svelte';

	let {
		form,
		profile,
		disciplines,
		candidateDisciplines,
		experienceLevels,
		documents
	}: {
		form: any;
		profile: any;
		disciplines: any[];
		candidateDisciplines: any[];
		experienceLevels: any[];
		documents: any[];
	} = $props();

	const locked = $derived(profile?.status === 'ACTIVE');
	const name = (id: string) => disciplines.find((d) => d.id === id)?.name ?? 'Unknown discipline';
	const level = (id: string) => sortLevels(experienceLevels).find((l) => l.id === id)?.value ?? '';

	/**
	 * Upload a certificate file to storage, returning its URL for the form to post.
	 * Same two-step shape the documents pages use: /api/uploadFile stores the bytes,
	 * then a form action records the row via the admin API.
	 */
	async function uploadCredentialFile(file: File) {
		const result = await uploadFile(file);
		return result.ok ? { url: result.url, filename: result.filename } : null;
	}
</script>

<svelte:head><title>Experience | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Experience" description={locked ? undefined : "Add each discipline you work in, how long you've done it, and the rate you'd like."} />

	{#if !profile}
		<!-- The shell's banner explains the failed load. Saving now could wipe real entries. -->
	{:else if locked}
		<Notice tone="info" title="Your experience is locked">
			Your profile is approved, so your disciplines, experience and rates can't be changed here. Keep your credentials up to date below, and contact support if anything else needs to change.
		</Notice>

		<ul class="space-y-4">
			{#each candidateDisciplines as discipline (discipline.disciplineId)}
				<li class="space-y-3 rounded-lg border bg-card p-5 shadow-card">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<h2 class="font-bold">{name(discipline.disciplineId)}</h2>
							<p class="text-sm text-muted-foreground">{level(discipline.experienceLevelId)}</p>
						</div>
						<p class="shrink-0 text-right text-sm font-semibold">
							${discipline.preferredHourlyMin ?? 0}-{discipline.preferredHourlyMax ?? 0}<span class="font-normal text-muted-foreground">/hr</span>
						</p>
					</div>

					<!-- The only editable things on this page once approved. The LICENSE slot
					     writes documents only; the CERTIFICATION slot writes the single date
					     on this entry through a narrow endpoint that can do nothing else. -->
					{#if discipline.requiresLicense}
						<CredentialSlot
							kind="LICENSE"
							disciplineId={discipline.disciplineId}
							disciplineName={name(discipline.disciplineId)}
							abbreviation={discipline.abbreviation ?? ''}
							required={true}
							effectiveExpiry={discipline.effectiveLicenseExpiry ?? null}
							graceStartedOn={discipline.licenseGraceStartedOn ?? null}
							{documents}
							onUploadFile={uploadCredentialFile}
						/>
					{/if}

					<!-- Rendered unconditionally: this is where a professional DECLARES that
					     their state requires a certification, so hiding it until they have
					     would make the opt-in unreachable. -->
					<CredentialSlot
						kind="CERTIFICATION"
						disciplineId={discipline.disciplineId}
						disciplineName={name(discipline.disciplineId)}
						abbreviation={discipline.abbreviation ?? ''}
						required={Boolean(discipline.requiresCert)}
						effectiveExpiry={discipline.effectiveCertExpiry ?? null}
						{documents}
						onUploadFile={uploadCredentialFile}
					/>
				</li>
			{/each}
		</ul>
	{:else}
		<ExperienceForm {form} {disciplines} {experienceLevels} saved={candidateDisciplines} submitLabel="Save experience" />
	{/if}
</Page>
