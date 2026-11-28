<script lang="ts">
	import { Briefcase, Building2 } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Page from '$dtss/Page.svelte';
	import { Button } from '$lib/components/ui/button';
	import JobCard from './JobCard.svelte';

	let { company, requisitions }: { company: any | null; requisitions: any[] } = $props();

	const jobs = $derived(
		requisitions.map((job) => ({
			...job,
			identityLocked: false,
			company: { id: company?.id, companyName: company?.companyName, companyLogo: company?.companyLogo }
		}))
	);
</script>

<svelte:head><title>{company?.companyName ?? 'Practice'} | DTSS</title></svelte:head>

<Page>
	{#if !company}
		<h1 class="sr-only">Practice unavailable</h1>
		<EmptyState icon={Building2} title="We couldn't load this practice" description="Please try again in a moment.">
			<Button href="/permanent" variant="outline">Back to permanent jobs</Button>
		</EmptyState>
	{:else}
		<header class="flex items-center gap-4">
			{#if company.companyLogo}
				<img src={company.companyLogo} alt="" class="size-14 shrink-0 rounded-full border bg-white object-contain p-1" />
			{:else}
				<span class="flex size-14 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
					<Building2 class="size-6" aria-hidden="true" />
				</span>
			{/if}
			<div class="min-w-0">
				<h1 class="text-h1">{company.companyName}</h1>
				{#if company.baseLocation}<p class="text-muted-foreground">{company.baseLocation}</p>{/if}
			</div>
		</header>

		{#if company.companyDescription}
			<section class="rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="about-heading">
				<h2 id="about-heading" class="text-h3">About</h2>
				<p class="mt-2 whitespace-pre-wrap text-muted-foreground">{company.companyDescription}</p>
			</section>
		{/if}

		<section aria-labelledby="openings-heading">
			<h2 id="openings-heading" class="mb-3 text-h3">Openings</h2>
			{#if jobs.length}
				<ul class="grid gap-4 md:grid-cols-2">
					{#each jobs as job (job.id)}
						<li><JobCard {job} /></li>
					{/each}
				</ul>
			{:else}
				<EmptyState icon={Briefcase} title="No openings right now" description="Openings from this practice will show up here." />
			{/if}
		</section>
	{/if}
</Page>
