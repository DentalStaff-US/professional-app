<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { CalendarCheck, CalendarSearch, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import AvailabilityEditor from '$lib/components/availability/AvailabilityEditor.svelte';
	import AvailabilityHiddenBanner from '$lib/components/availability/AvailabilityHiddenBanner.svelte';
	import type { AvailabilityState } from '$lib/components/availability/availability';
	import { Button } from '$lib/components/ui/button';
	import WorkPreferenceBanner from '$lib/components/workPreference/WorkPreferenceBanner.svelte';
	import { cn } from '$lib/utils';
	import ClaimShiftSheet from './ClaimShiftSheet.svelte';
	import ShiftCard from './ShiftCard.svelte';
	import CalendarGrid from './CalendarGrid.svelte';
	import { dayMarks, groupByDay, isClaimed, monthOf, shiftDate, weekOf } from '../agenda';
	import { formatShiftDate } from '../format';

	type Filter = 'ALL' | 'OPEN' | 'CLAIMED';
	const FILTERS: { id: Filter; label: string }[] = [
		{ id: 'ALL', label: 'All' },
		{ id: 'OPEN', label: 'Open' },
		{ id: 'CLAIMED', label: 'Claimed' }
	];

	let {
		recurrenceDays,
		today,
		focusDate = null,
		focusReqId = null,
		hiddenByAvailability = 0,
		showUnavailable = false,
		workPreference,
		claimForm,
		availabilityForm,
		availabilityLoaded = false,
		bookedDates = []
	}: {
		recurrenceDays: any[];
		today: string;
		focusDate?: string | null;
		focusReqId?: number | null;
		hiddenByAvailability?: number;
		showUnavailable?: boolean;
		workPreference?: any;
		claimForm: any;
		availabilityForm: any;
		availabilityLoaded?: boolean;
		bookedDates?: any[];
	} = $props();

	let view = $state<'week' | 'month'>('week');
	let filter = $state<Filter>('ALL');
	let offset = $state(0);
	let selectedDate = $state<string | null>(focusDate);
	let selectedShift = $state<any>(null);
	let sheetOpen = $state(false);

	const filtered = $derived(
		recurrenceDays.filter((shift) =>
			filter === 'OPEN'
				? shift.recurrenceDay?.status === 'OPEN'
				: filter === 'CLAIMED'
					? isClaimed(shift)
					: true
		)
	);
	const marks = $derived(dayMarks(filtered));
	const anchor = $derived(focusDate ?? today);
	const month = $derived(monthOf(anchor, offset));
	const gridDays = $derived(view === 'month' ? month.days : weekOf(anchor, offset));
	const heading = $derived(
		new Date(`${view === 'month' ? `${month.month}-01` : gridDays[0]}T00:00:00Z`).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	// A chosen day shows that day, past ones included. Otherwise, what's coming up.
	const days = $derived(
		selectedDate
			? groupByDay(filtered.filter((shift) => shiftDate(shift) === selectedDate), selectedDate)
			: groupByDay(filtered, today)
	);

	function setView(next: 'week' | 'month') {
		view = next;
		offset = 0;
	}

	let calendarEl = $state<HTMLElement>();
	let dayHeadingEl = $state<HTMLElement>();

	const scrollBehavior = (): ScrollBehavior =>
		window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

	async function selectDay(date: string) {
		selectedDate = selectedDate === date ? null : date;
		if (!selectedDate) return;
		await tick();
		// A month grid can fill a phone screen, leaving the result out of sight. Only
		// move when it would be, so a tap on a short week strip doesn't jump the page.
		const heading = dayHeadingEl;
		if (!heading) return;
		heading.focus({ preventScroll: true });
		if (heading.getBoundingClientRect().top > window.innerHeight * 0.55) {
			heading.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
		}
	}

	function backToCalendar() {
		calendarEl?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
	}

	function openShift(shift: any) {
		selectedShift = shift;
		sheetOpen = true;
	}

	onMount(() => {
		// ?req= from the job board's return-to-job flow: open that requisition's shift,
		// on the focus date when given, else its first open shift. A silent no-op if
		// it's gone (filled, or hidden by availability or credentials; banners explain).
		if (!focusReqId) return;
		const forReq = recurrenceDays.filter(
			(shift) => Number(shift.requisition?.id) === focusReqId && shift.recurrenceDay?.status === 'OPEN'
		);
		const onDate = forReq.find((shift) => focusDate && shiftDate(shift) === focusDate);
		const target = onDate ?? forReq[0];
		if (target) openShift(target);
	});

	// ── Availability ────────────────────────────
	// A MODE, not an overlay. In shift mode a tap means "tell me about this shift";
	// in availability mode it means "I can't work this day". Same pixels, two
	// meanings, and here the mistake silently removes someone's work, so the two
	// never share a grid.
	let editingAvailability = $state(false);

	const {
		enhance: availabilityEnhance,
		submitting: availabilitySubmitting,
		form: availabilityData
	} = superForm(availabilityForm, {
		dataType: 'json',
		id: 'availability',
		onResult: ({ result }) => {
			if (result.type === 'success' || result.type === 'redirect') editingAvailability = false;
		}
	});

	let availabilityFormEl = $state<HTMLFormElement>();

	function saveAvailability(state: AvailabilityState) {
		$availabilityData.availableDays = state.availableDays;
		$availabilityData.blockedDates = state.blockedDates;
		availabilityFormEl?.requestSubmit();
	}

	const navButton =
		'flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

	const segment = (active: boolean) =>
		cn(
			'flex h-11 items-center justify-center rounded-md px-2 text-sm sm:px-3 font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
			active ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
		);
</script>

<svelte:head><title>Calendar | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Calendar">
		{#snippet actions()}
			<Button
				variant="outline"
				disabled={!availabilityLoaded}
				on:click={() => (editingAvailability = !editingAvailability)}
			>
				<CalendarCheck class="mr-2 size-4" aria-hidden="true" />
				{editingAvailability ? 'Done editing' : 'Edit availability'}
			</Button>
		{/snippet}
	</PageHeader>

	{#if !availabilityLoaded}
		<p class="text-sm text-muted-foreground">
			We couldn't load your availability, so editing is paused. Refresh and try again.
		</p>
	{/if}

	<WorkPreferenceBanner {workPreference} />
	<AvailabilityHiddenBanner
		hiddenCount={hiddenByAvailability}
		showingUnavailable={showUnavailable}
		basePath="/calendar"
		onEdit={editingAvailability ? null : () => (editingAvailability = true)}
		editDisabled={!availabilityLoaded}
	/>

	{#if editingAvailability}
		<Notice tone="info">Editing your availability. Tap a date to mark a day you can't work.</Notice>
		<form method="POST" action="?/saveAvailability" use:availabilityEnhance bind:this={availabilityFormEl}>
			<AvailabilityEditor
				initialAvailableDays={availabilityForm.data.availableDays}
				initialBlockedDates={availabilityForm.data.blockedDates}
				{bookedDates}
				{today}
				loaded={availabilityLoaded}
				submitting={$availabilitySubmitting}
				onSave={saveAvailability}
			/>
		</form>
	{:else}
		<div class="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:w-72" role="group" aria-label="Filter shifts">
			{#each FILTERS as option (option.id)}
				<button class={segment(filter === option.id)} aria-pressed={filter === option.id} onclick={() => (filter = option.id)}>
					{option.label}
				</button>
			{/each}
		</div>

		<section bind:this={calendarEl} class="scroll-mt-4 rounded-lg border bg-card p-3 shadow-card sm:p-4" aria-label="Calendar">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex items-center">
					<button aria-label={`Previous ${view}`} class={navButton} onclick={() => (offset -= 1)}>
						<ChevronLeft class="size-5" aria-hidden="true" />
					</button>
					<p class="min-w-0 px-1 text-center font-bold" aria-live="polite">{heading}</p>
					<button aria-label={`Next ${view}`} class={navButton} onclick={() => (offset += 1)}>
						<ChevronRight class="size-5" aria-hidden="true" />
					</button>
				</div>
				<div class="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="View">
					<button class={segment(view === 'week')} aria-pressed={view === 'week'} onclick={() => setView('week')}>Week</button>
					<button class={segment(view === 'month')} aria-pressed={view === 'month'} onclick={() => setView('month')}>Month</button>
				</div>
			</div>

			<CalendarGrid
				days={gridDays}
				currentMonth={view === 'month' ? month.month : null}
				{today}
				selected={selectedDate}
				{marks}
				onselect={selectDay}
			/>

			<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground" aria-label="Legend">
				<li class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-status-info-solid" aria-hidden="true"></span> Open</li>
				<li class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-status-positive-solid" aria-hidden="true"></span> Claimed</li>
				<li class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-status-neutral-solid" aria-hidden="true"></span> Day you marked off</li>
			</ul>
		</section>

		{#if selectedDate}
			<div class="flex scroll-mt-4 flex-wrap items-center justify-between gap-x-3 outline-none" bind:this={dayHeadingEl} tabindex="-1">
				<h2 class="text-h3">{selectedDate === today ? 'Today' : formatShiftDate(`${selectedDate}T00:00:00Z`)}</h2>
				<div class="flex gap-4">
					<button class="min-h-11 text-sm font-bold text-primary-dark hover:underline" onclick={backToCalendar}>
						Pick another day
					</button>
					<button class="min-h-11 text-sm font-bold text-primary-dark hover:underline" onclick={() => (selectedDate = null)}>
						Show all
					</button>
				</div>
			</div>
		{/if}

		{#if days.length}
			<div class="space-y-6">
				{#each days as day (day.date)}
					<section aria-label={formatShiftDate(`${day.date}T00:00:00Z`, true)}>
						{#if !selectedDate}
							<h2 class="mb-3 text-h3">{day.date === today ? 'Today' : formatShiftDate(`${day.date}T00:00:00Z`)}</h2>
						{/if}
						<ul class="grid gap-4 md:grid-cols-2">
							{#each day.shifts as shift (shift.recurrenceDay.id)}
								<li>
									<ShiftCard {shift}>
										{#snippet action()}
											{#if isClaimed(shift)}
												<Button href={`/my-shifts/${shift.workday.id}`} size="lg" class="w-full">View shift</Button>
											{:else}
												<Button variant="outline" size="lg" class="w-full" on:click={() => openShift(shift)}>View details</Button>
											{/if}
										{/snippet}
									</ShiftCard>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{:else}
			<EmptyState
				icon={CalendarSearch}
				title={selectedDate ? 'Nothing on this day' : filter === 'ALL' ? 'Nothing on your calendar yet' : `No ${filter === 'OPEN' ? 'open' : 'claimed'} shifts coming up`}
				description="New shifts show up here as practices post them."
			>
				{#if filter !== 'ALL'}
					<Button variant="outline" on:click={() => (filter = 'ALL')}>Show all shifts</Button>
				{/if}
			</EmptyState>
		{/if}
	{/if}
</Page>

<ClaimShiftSheet {claimForm} shift={selectedShift} bind:open={sheetOpen} />
