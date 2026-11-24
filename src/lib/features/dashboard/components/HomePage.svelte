<script lang="ts">
	import Notice from '$dtss/Notice.svelte';
	import InstallPrompt from './InstallPrompt.svelte';
	import type { HomeNudge } from '../nudges';
	import {
		CalendarCheck,
		CalendarSearch,
		ChevronRight,
		Clipboard,
		MapPin,
		Navigation
	} from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import GhostStack from '$dtss/GhostStack.svelte';
	import IconSquare from '$dtss/IconSquare.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import {
		ClaimShiftSheet,
		directionsUrl,
		formatShiftDate,
		formatTimeRange,
		formatWorkWeek,
		relativeShiftDay,
		ShiftCard
	} from '$features/shifts';
	import AvailabilityHiddenBanner from '$lib/components/availability/AvailabilityHiddenBanner.svelte';
	import CertLockedBanner from '$lib/components/certifications/CertLockedBanner.svelte';
	import NewSupportTicketDialog from '$lib/components/new-support-ticket-dialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import QuickLinks from './QuickLinks.svelte';
	import type { AffiliateStatus } from '../quickLinks';
	import { needsAttention } from '../attention';
	import WorkPreferenceBanner from '$lib/components/workPreference/WorkPreferenceBanner.svelte';

	const OPEN_SHIFTS_SHOWN = 6;

	let {
		firstName,
		workdays,
		timesheets,
		requisitions,
		certLocked,
		hiddenByAvailability,
		showUnavailable,
		workPreference,
		claimForm,
		affiliateStatus,
		nudges = []
	}: {
		firstName?: string | null;
		workdays: any[];
		timesheets: any[];
		requisitions: any[];
		certLocked: any[];
		hiddenByAvailability: number;
		showUnavailable: boolean;
		workPreference: any;
		claimForm: any;
		affiliateStatus?: AffiliateStatus;
		nudges?: HomeNudge[];
	} = $props();

	let selectedShift = $state<any>(null);
	let sheetOpen = $state(false);
	let supportOpen = $state(false);

	const startOf = (shift: any) =>
		new Date(shift.recurrenceDay?.dayStart ?? shift.recurrenceDay?.date ?? 0).getTime();
	const nextShift = $derived([...workdays].sort((a, b) => startOf(a) - startOf(b))[0]);
	const attention = $derived(needsAttention(timesheets));
	const firstRun = $derived(!workdays.length && !timesheets.length && !requisitions.length);
	const address = $derived(nextShift?.location?.completeAddress);

	function openShift(shift: any) {
		selectedShift = shift;
		sheetOpen = true;
	}
</script>

<svelte:head><title>Home | DTSS</title></svelte:head>

<Page>
	<PageHeader title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'} />

	<CertLockedBanner {certLocked} />
	<AvailabilityHiddenBanner
		hiddenCount={hiddenByAvailability}
		showingUnavailable={showUnavailable}
		basePath="/dashboard"
	/>
	<WorkPreferenceBanner {workPreference} />

	{#each nudges as nudge (nudge.id)}
		<Notice tone="warning" title={nudge.title}>
			{nudge.text}
			<a href={nudge.href} class="mt-1 block min-h-11 py-2 font-bold underline">{nudge.action}</a>
		</Notice>
	{/each}

	<InstallPrompt hasClaimed={workdays.length > 0} />

	{#if firstRun}
		<section class="rounded-2xl bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6 ring-1 ring-primary/15 sm:p-10">
			<GhostStack />
			<div class="mt-8 text-center">
				<h2 class="text-h2">Your shifts will show up here</h2>
				<p class="mx-auto mt-2 max-w-md text-muted-foreground">
					Set your availability so we can show you the right shifts as practices post them.
				</p>
				<Button href="/settings/availability" size="lg" class="mt-5">Set your availability</Button>
			</div>
		</section>

		<QuickLinks {affiliateStatus} onsupport={() => (supportOpen = true)} />
	{:else}
		{#if nextShift}
			<section aria-labelledby="next-shift-heading">
				<h2 id="next-shift-heading" class="sr-only">Your next shift</h2>
				<div class="rounded-2xl bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-5 shadow-float ring-1 ring-primary/15 sm:p-6">
					<div class="flex items-center justify-between gap-2">
						<p class="text-overline uppercase text-primary-dark">
							Your next shift{#if relativeShiftDay(nextShift.recurrenceDay?.date, nextShift.requisition?.referenceTimezone)}{' '}· {relativeShiftDay(nextShift.recurrenceDay?.date, nextShift.requisition?.referenceTimezone)}{/if}
						</p>
						<StatusBadge status={nextShift.recurrenceDay?.status} />
					</div>
					<p class="mt-3 text-h2">{nextShift.requisition?.disciplineName ?? nextShift.requisition?.discipline}</p>
					<p class="mt-1 font-semibold">{nextShift.company?.companyName ?? nextShift.company?.name}</p>
					<p class="mt-1 text-muted-foreground">
						{formatShiftDate(nextShift.recurrenceDay?.date)} · {formatTimeRange(nextShift.recurrenceDay?.dayStart, nextShift.recurrenceDay?.dayEnd, nextShift.requisition?.referenceTimezone)}
					</p>
					{#if nextShift.location?.name}
						<p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
							<MapPin class="size-4" aria-hidden="true" /> {nextShift.location.name}
						</p>
					{/if}
					<div class="mt-4 flex flex-wrap gap-2">
						<Button href={`/my-shifts/${nextShift.workday.id}`}>View shift</Button>
						{#if address}
							<Button href={directionsUrl(address)} target="_blank" rel="noopener" variant="outline">
								<Navigation class="mr-2 size-4" aria-hidden="true" /> Directions
							</Button>
						{/if}
					</div>
				</div>
			</section>
		{/if}

		{#if attention.length}
			<section aria-labelledby="attention-heading">
				<h2 id="attention-heading" class="mb-3 text-h3">Needs your attention</h2>
				<ul class="space-y-3">
					{#each attention as row (row.timesheet.id)}
						<li>
							<a
								href={`/timesheets/${row.timesheet.id}`}
								class="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card transition duration-fast hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<IconSquare icon={Clipboard} tone="pending" />
								<span class="min-w-0 flex-1">
									<span class="block font-bold">Timesheet: {formatWorkWeek(row.timesheet.weekBeginDate)}</span>
									<span class="block truncate text-sm text-muted-foreground">
										{row.company?.name}{#if row.timesheet.totalHoursWorked != null}{' '}· {row.timesheet.totalHoursWorked} hours{/if}
									</span>
								</span>
								<StatusBadge status={row.timesheet.status} />
								<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<QuickLinks {affiliateStatus} onsupport={() => (supportOpen = true)} />

		<section aria-labelledby="open-shifts-heading">
			<div class="mb-3 flex items-center justify-between gap-3">
				<h2 id="open-shifts-heading" class="text-h3">
					Open near you{#if requisitions.length}{' '}({requisitions.length}){/if}
				</h2>
				{#if requisitions.length}
					<a href="/my-shifts?tab=available" class="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary-dark hover:underline">
						See all <ChevronRight class="size-4" aria-hidden="true" />
					</a>
				{/if}
			</div>
			{#if requisitions.length}
				<ul class="grid gap-4 md:grid-cols-2">
					{#each requisitions.slice(0, OPEN_SHIFTS_SHOWN) as shift (shift.recurrenceDay?.id)}
						<li>
							<ShiftCard {shift}>
								{#snippet action()}
									<Button variant="outline" size="lg" class="w-full" on:click={() => openShift(shift)}>
										View details
									</Button>
								{/snippet}
							</ShiftCard>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					icon={CalendarSearch}
					title="No open shifts right now"
					description="New shifts show up here as practices post them. Keeping your availability current helps."
				>
					<Button href="/settings/availability" variant="outline">
						<CalendarCheck class="mr-2 size-4" aria-hidden="true" /> Update availability
					</Button>
				</EmptyState>
			{/if}
		</section>
	{/if}
</Page>

<ClaimShiftSheet {claimForm} shift={selectedShift} bind:open={sheetOpen} />
<NewSupportTicketDialog bind:open={supportOpen} />
