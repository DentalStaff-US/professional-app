<script lang="ts">
	import { enhance } from '$app/forms';
	import { Loader2, Sparkles } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { uploadFile } from '$features/profile';
	import SkillCertSlot from '$lib/components/skills/SkillCertSlot.svelte';
	import { Button } from '$lib/components/ui/button';

	let { skills, catalog, editable }: { skills: any[]; catalog: any[]; editable: boolean } = $props();

	let saving = $state(false);
	let selected = $state<string[]>([]);

	// Re-sync after a save round-trips new data.
	$effect(() => {
		selected = skills.map((skill) => skill.skillId);
	});

	const certSkills = $derived(skills.filter((skill) => skill.requiresCertificate));
	const heldByCategory = $derived(
		catalog
			.map((category) => ({ category, skills: skills.filter((skill) => skill.categoryId === category.id) }))
			.filter((group) => group.skills.length > 0)
	);

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id];
	}

	/** Same two-step upload as the Experience page: store bytes, then record the row. */
	async function uploadCertificate(file: File) {
		const result = await uploadFile(file);
		return result.ok ? { url: result.url, filename: result.filename } : null;
	}
</script>

<svelte:head><title>Skills | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Skills" description="Practices can require specific skills for a shift or position. Tell us what you can do so we can match you to the right work." />

	{#if !editable}
		<Notice tone="info" title="Your skills are locked">
			Your profile is approved, so your skills can't be changed here. You can still keep their certificates up to date below. Contact support if a skill needs to change.
		</Notice>

		{#if heldByCategory.length}
			{#each heldByCategory as group (group.category.id)}
				<section class="rounded-lg border bg-card p-5 shadow-card" aria-label={group.category.name}>
					<h2 class="text-h3">{group.category.name}</h2>
					<ul class="mt-2 space-y-2">
						{#each group.skills as skill (skill.skillId)}
							<li>
								{skill.name}
								{#if skill.requiresCertificate}
									<SkillCertSlot skillId={skill.skillId} skillName={skill.name} certExpiresOn={skill.certExpiresOn} effective={skill.effective} onUploadFile={uploadCertificate} />
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{:else}
			<EmptyState icon={Sparkles} title="No skills on file" description="Contact support if you need to add one." />
		{/if}
	{:else if !catalog.length}
		<EmptyState icon={Sparkles} title="No skills to choose from yet" description="Skills are set up for each discipline. Add your disciplines under Experience first.">
			<Button href="/settings/experience" variant="outline">Go to Experience</Button>
		</EmptyState>
	{:else}
		<form
			method="POST"
			action="?/saveSkills"
			class="space-y-4"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update({ reset: false });
					saving = false;
				};
			}}
		>
			{#each catalog as category (category.id)}
				<fieldset class="rounded-lg border bg-card p-5 shadow-card">
					<legend class="sr-only">{category.name}</legend>
					<p class="text-h3" aria-hidden="true">{category.name}</p>
					{#if category.description}<p class="mt-1 text-sm text-muted-foreground">{category.description}</p>{/if}
					<div class="mt-2 grid gap-x-4 sm:grid-cols-2">
						{#each category.skills as skill (skill.id)}
							<label class="flex min-h-11 cursor-pointer items-center gap-3 py-1">
								<input
									type="checkbox"
									name="skillIds"
									value={skill.id}
									checked={selected.includes(skill.id)}
									onchange={() => toggle(skill.id)}
									class="size-5 shrink-0 rounded border-input accent-primary-strong"
								/>
								<span>
									{skill.name}
									{#if skill.requiresCertificate}<span class="block text-sm text-muted-foreground">Certificate required</span>{/if}
								</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{/each}
			<Button type="submit" size="lg" class="w-full sm:w-auto" disabled={saving}>
				{#if saving}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
				Save skills
			</Button>
		</form>

		{#if certSkills.length}
			<section class="space-y-2" aria-labelledby="certs-heading">
				<h2 id="certs-heading" class="text-h3">Certificates for your skills</h2>
				<p class="text-muted-foreground">These skills only count once a current certificate is on file.</p>
				{#each certSkills as skill (skill.skillId)}
					<SkillCertSlot skillId={skill.skillId} skillName={skill.name} certExpiresOn={skill.certExpiresOn} effective={skill.effective} onUploadFile={uploadCertificate} />
				{/each}
			</section>
		{/if}
	{/if}
</Page>
