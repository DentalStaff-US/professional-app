<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Briefcase, Loader2, Lock, MapPin } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { isPracticeLocked } from '$lib/_helpers/practiceIdentity';
	import LockedPracticeDetails from '$lib/components/general/LockedPracticeDetails.svelte';
	import { Button } from '$lib/components/ui/button';
	import { applyButtonState, jobStatusLabel, type ApplicationStatus } from '../jobStatus';

	let {
		job,
		application,
		reqStatus,
		canApply,
		applyForm
	}: {
		job: any | null;
		application: ApplicationStatus;
		reqStatus: string | null;
		canApply: boolean;
		applyForm: any;
	} = $props();

	const { enhance, submitting, errors } = superForm(applyForm);

	const locked = $derived(isPracticeLocked(job));
	const button = $derived(applyButtonState(application, canApply));
	const jobStatus = $derived(jobStatusLabel(reqStatus));
	const applyError = $derived(($errors as any)?.message ?? ($errors as any)?._errors?.[0]);
</script>

<svelte:head><title>{job?.disciplineName ?? 'Job unavailable'} | DTSS</title></svelte:head>

<Page>
	{#if !job}
		<h1 class="sr-only">Job unavailable</h1>
		<EmptyState
			icon={Briefcase}
			title="This job is no longer available"
			description="It may have been filled, closed or removed by the practice."
		>
			<Button href="/permanent">Back to permanent jobs</Button>
		</EmptyState>
	{:else}
		{#if applyError}
			<Notice tone="negative" alert>{applyError}</Notice>
		{:else if application === 'PENDING'}
			<Notice tone="pending" title="Application pending">Your application is waiting for the practice's review.</Notice>
		{:else if application === 'APPROVED'}
			<Notice tone="positive" title="Your application was approved">The practice will be in touch with next steps.</Notice>
		{:else if application === 'DENIED'}
			<Notice tone="info">Thank you for applying. This practice moved forward with another applicant. We hope to have more positions for you soon.</Notice>
		{/if}

		<header class="flex items-start gap-4">
			{#if locked}
				<span class="flex size-14 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
					<Lock class="size-6" aria-hidden="true" />
				</span>
			{:else if job.company?.companyLogo}
				<img src={job.company.companyLogo} alt="" class="size-14 shrink-0 rounded-full border bg-white object-contain p-1" />
			{/if}
			<div class="min-w-0">
				{#if jobStatus}
					<div class="mb-2"><StatusBadge status={jobStatus.status} label={jobStatus.label} /></div>
				{/if}
				<h1 class="text-h1">{job.disciplineName}</h1>
				{#if !locked && job.company?.companyName}
					<a href={`/company/${job.company.id}`} class="mt-1 inline-flex min-h-11 items-center font-semibold text-primary-dark hover:underline">
						{job.company.companyName}
					</a>
				{/if}
			</div>
		</header>

		<div class="grid gap-6 md:grid-cols-3">
			<div class="space-y-6 md:col-span-2">
				<section class="rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="about-heading">
					<h2 id="about-heading" class="text-h3">About this job</h2>
					<p class="mt-2 whitespace-pre-wrap text-muted-foreground">{job.jobDescription || 'The practice will share more details as your application moves forward.'}</p>
				</section>
				{#if job.specialInstructions}
					<Notice tone="info" title="Special instructions">
						<span class="whitespace-pre-wrap">{job.specialInstructions}</span>
					</Notice>
				{/if}
			</div>

			<aside class="space-y-4">
				<section class="space-y-3 rounded-lg border bg-card p-5 text-sm shadow-card" aria-label="Job details">
					<p class="flex items-center gap-2 font-semibold">
						<Briefcase class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						{job.permanentPosition === false ? 'Temporary hire' : 'Permanent'}
					</p>
					{#if locked}
						<LockedPracticeDetails
							city={job.location?.city}
							state={job.location?.state}
							distanceMiles={job.location?.distanceMiles}
							unlockMessage="The practice name and address are shared once your application is approved."
						/>
					{:else if job.location?.completeAddress}
						<p class="flex items-start gap-2">
							<MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							{job.location.completeAddress}
						</p>
					{/if}
				</section>
			</aside>
		</div>

		<div class="h-20 md:hidden" aria-hidden="true"></div>
		<form
			method="POST"
			action="?/applyForOpening"
			use:enhance
			class="fixed inset-x-0 bottom-[var(--tabbar-offset,0px)] z-20 border-t bg-card/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0"
		>
			<input type="hidden" name="requisitionId" value={job.id} />
			<Button type="submit" size="lg" class="w-full md:w-auto" disabled={button.disabled || $submitting}>
				{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
				{button.label}
			</Button>
		</form>
	{/if}
</Page>
