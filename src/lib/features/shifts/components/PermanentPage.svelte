<script lang="ts">
	import { Briefcase, Send } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import CertLockedBanner from '$lib/components/certifications/CertLockedBanner.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import WorkPreferenceBanner from '$lib/components/workPreference/WorkPreferenceBanner.svelte';
	import JobCard from './JobCard.svelte';
	import ShiftsTabs from './ShiftsTabs.svelte';

	let {
		requisitions,
		applied,
		certLocked,
		workPreference
	}: { requisitions: any[]; applied: any[] | null; certLocked: any[]; workPreference: any } = $props();

	// An applied job shouldn't also surface under Recommended: the Applied tab is
	// where the professional tracks it.
	const appliedJobs = $derived(applied ?? []);
	const appliedIds = $derived(new Set(appliedJobs.map((job) => job?.id)));
	const openJobs = $derived(requisitions.filter((job) => !appliedIds.has(job.id)));
</script>

<svelte:head><title>Permanent jobs | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Shifts" description="Find work and keep track of your schedule." />
	<ShiftsTabs active="permanent" />

	<CertLockedBanner {certLocked} />
	<WorkPreferenceBanner {workPreference} />

	<Tabs.Root value="recommended">
		<Tabs.List>
			<Tabs.Trigger value="recommended" class="min-h-9">Recommended</Tabs.Trigger>
			<Tabs.Trigger value="applied" class="min-h-9">Applied{#if appliedJobs.length}{' '}({appliedJobs.length}){/if}</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="recommended" class="mt-4">
			{#if openJobs.length}
				<ul class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each openJobs as job (job.id)}
						<li><JobCard {job} /></li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					icon={Briefcase}
					title="No permanent jobs right now"
					description="New openings near you will show up here. In the meantime, temp shifts can lead to permanent roles."
				>
					<Button href="/my-shifts?tab=available" variant="outline">Browse temp shifts</Button>
				</EmptyState>
			{/if}
		</Tabs.Content>
		<Tabs.Content value="applied" class="mt-4">
			{#if appliedJobs.length}
				<ul class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each appliedJobs as job (job.id)}
						<li><JobCard {job} cta="View application" /></li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					icon={Send}
					title="No applications yet"
					description="Jobs you apply for will show up here so you can track them."
				/>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</Page>
