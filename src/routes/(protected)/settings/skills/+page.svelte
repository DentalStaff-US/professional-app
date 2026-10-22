<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import Button from '$lib/components/ui/button/button.svelte';
	import { enhance } from '$app/forms';
	import SkillCertSlot from '$lib/components/skills/SkillCertSlot.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let saving = false;
	let selected = new Set<string>(data.skills.map((s) => s.skillId));
	$: heldById = new Map(data.skills.map((s) => [s.skillId, s]));
	$: certSkills = data.skills.filter((s) => s.requiresCertificate);

	// Re-sync after a save round-trips new data.
	let lastSkills = data.skills;
	$: if (data.skills !== lastSkills) {
		lastSkills = data.skills;
		selected = new Set(data.skills.map((s) => s.skillId));
	}

	function toggle(id: string) {
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
		selected = selected;
	}

	/** Same two-step upload as the Experience page: store bytes, then record the row. */
	async function uploadFile(file: File) {
		const fd = new FormData();
		fd.append('file', file);
		fd.append('location', 'candidate-documents');
		const res = await fetch('/api/uploadFile', { method: 'POST', body: fd });
		if (!res.ok) return null;
		const json = await res.json();
		if (!json?.success || !json?.url) return null;
		return { url: json.url as string, filename: (json.fileName ?? file.name) as string };
	}

	$: heldByCategory = data.catalog
		.map((c) => ({ category: c, skills: data.skills.filter((s) => s.categoryId === c.id) }))
		.filter((g) => g.skills.length > 0);
</script>

<svelte:head>
	<title>Skills | DTSS</title>
</svelte:head>

<section class="sm:container mx-auto px-4 py-6 space-y-6">
	<div>
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">Skills</h1>
		<p class="mt-1 text-sm text-gray-600">
			Practices can require specific skills for a shift or position. Tell us what you can do so we
			can match you to the right work.
		</p>
	</div>

	{#if data.loadError}
		<Alert.Root variant="destructive">
			<Alert.Description>{data.loadError}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if !data.editable}
		<Alert.Root>
			<Alert.Title class="text-lg font-semibold">Profile Approved</Alert.Title>
			<Alert.Description>
				Your profile has been approved, so your skills are locked. You can still keep the
				certificates for your skills up to date below. Contact support if a skill needs to change.
			</Alert.Description>
		</Alert.Root>

		{#if heldByCategory.length === 0}
			<p class="text-sm text-gray-600">No skills on file.</p>
		{/if}
		{#each heldByCategory as g (g.category.id)}
			<div class="rounded-lg border bg-white p-4">
				<h2 class="mb-2 text-sm font-semibold">{g.category.name}</h2>
				<ul class="space-y-1">
					{#each g.skills as s (s.skillId)}
						<li class="text-sm">
							{s.name}
							{#if s.requiresCertificate}
								<SkillCertSlot
									skillId={s.skillId}
									skillName={s.name}
									certExpiresOn={s.certExpiresOn}
									effective={s.effective}
									onUploadFile={uploadFile}
								/>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{:else}
		<form
			method="POST"
			action="?/saveSkills"
			class="space-y-4"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					saving = false;
					await update({ reset: false });
				};
			}}
		>
			{#if data.catalog.length === 0}
				<p class="text-sm text-gray-600">
					No skills are set up for your disciplines yet. Add your disciplines under Experience
					first.
				</p>
			{/if}
			{#each data.catalog as category (category.id)}
				<fieldset class="rounded-lg border bg-white p-4">
					<legend class="px-1 text-sm font-semibold">{category.name}</legend>
					{#if category.description}
						<p class="mb-2 text-xs text-gray-600">{category.description}</p>
					{/if}
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{#each category.skills as skill (skill.id)}
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									name="skillIds"
									value={skill.id}
									checked={selected.has(skill.id)}
									on:change={() => toggle(skill.id)}
									class="h-4 w-4 rounded border-gray-300"
								/>
								{skill.name}
								{#if skill.requiresCertificate}
									<span class="text-xs text-gray-500">(certificate required)</span>
								{/if}
							</label>
						{/each}
					</div>
				</fieldset>
			{/each}
			{#if data.catalog.length > 0}
				<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save skills'}</Button>
			{/if}
		</form>

		{#if certSkills.length > 0}
			<div class="space-y-2">
				<h2 class="text-lg font-semibold">Certificates for your skills</h2>
				<p class="text-sm text-gray-600">
					These skills only count once a current certificate is on file.
				</p>
				{#each certSkills as s (s.skillId)}
					{#if heldById.has(s.skillId)}
						<SkillCertSlot
							skillId={s.skillId}
							skillName={s.name}
							certExpiresOn={s.certExpiresOn}
							effective={s.effective}
							onUploadFile={uploadFile}
						/>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</section>
