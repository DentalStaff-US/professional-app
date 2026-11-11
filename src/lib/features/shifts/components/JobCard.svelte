<script lang="ts">
	import { Briefcase, Lock, MapPin } from 'lucide-svelte';
	import { isPracticeLocked } from '$lib/_helpers/practiceIdentity';
	import { Button } from '$lib/components/ui/button';

	let { job, cta = 'View job' }: { job: any; cta?: string } = $props();

	const locked = $derived(isPracticeLocked(job));
	const place = $derived(
		(!locked && job.location?.completeAddress) ||
			[job.location?.city, job.location?.state].filter(Boolean).join(', ')
	);
	const distance = $derived(job.distanceMiles ?? job.location?.distanceMiles);
</script>

<article class="flex h-full flex-col rounded-xl border bg-card p-5 shadow-card">
	<div class="flex items-start gap-3">
		{#if locked}
			<span class="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
				<Lock class="size-5" aria-hidden="true" />
			</span>
		{:else if job.company?.companyLogo}
			<img alt="" src={job.company.companyLogo} class="size-12 shrink-0 rounded-full border bg-white object-contain p-1" />
		{:else}
			<span class="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
				<Briefcase class="size-5" aria-hidden="true" />
			</span>
		{/if}
		<div class="min-w-0">
			<h3 class="text-h3">{job.disciplineName}</h3>
			<p class="text-sm text-muted-foreground">
				{locked ? 'Practice shared once you\'re approved' : job.company?.companyName}
			</p>
		</div>
	</div>

	<ul class="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
		<li class="flex items-start gap-2">
			<Briefcase class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			{job.permanentPosition === false ? 'Temporary hire' : 'Permanent'}
		</li>
		{#if place}
			<li class="flex items-start gap-2">
				<MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span>{place}{#if distance != null}{' '}· about {distance} mi{/if}</span>
			</li>
		{/if}
	</ul>

	<Button href={`/permanent/${job.id}`} variant="outline" size="lg" class="mt-4 w-full">{cta}</Button>
</article>
