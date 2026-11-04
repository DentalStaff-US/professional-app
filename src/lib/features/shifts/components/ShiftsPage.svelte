<script lang="ts">
	import { CalendarCheck, CalendarSearch, History } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import AvailabilityHiddenBanner from '$lib/components/availability/AvailabilityHiddenBanner.svelte';
	import CertLockedBanner from '$lib/components/certifications/CertLockedBanner.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import WorkPreferenceBanner from '$lib/components/workPreference/WorkPreferenceBanner.svelte';
	import CancelShiftButton from './CancelShiftButton.svelte';
	import ClaimShiftSheet from './ClaimShiftSheet.svelte';
	import ShiftCard from './ShiftCard.svelte';
	import ShiftsTabs from './ShiftsTabs.svelte';
	import { canCancelShift, shiftMonth, splitShifts } from '../split';

	let {
		tab,
		workdays,
		openShifts,
		certLocked,
		hiddenByAvailability,
		showUnavailable,
		workPreference,
		claimForm
	}: {
		tab: string | null;
		workdays: any[];
		openShifts: any[];
		certLocked: any[];
		hiddenByAvailability: number;
		showUnavailable: boolean;
		workPreference: any;
		claimForm: any;
	} = $props();

	const active = $derived(tab === 'available' || tab === 'past' ? tab : 'upcoming');
	const split = $derived(splitShifts(workdays));

	let selectedShift = $state<any>(null);
	let sheetOpen = $state(false);
	let month = $state('');

	const months = $derived([...new Set(split.past.map(shiftMonth).filter(Boolean))]);
	const past = $derived(month ? split.past.filter((s) => shiftMonth(s) === month) : split.past);

	function openShift(shift: any) {
		selectedShift = shift;
		sheetOpen = true;
	}
</script>

<svelte:head><title>Shifts | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Shifts" description="Find work and keep track of your schedule." />
	<ShiftsTabs {active} />

	{#if active === 'available'}
		<CertLockedBanner {certLocked} />
		<AvailabilityHiddenBanner
			hiddenCount={hiddenByAvailability}
			showingUnavailable={showUnavailable}
			basePath="/my-shifts?tab=available"
		/>
		<WorkPreferenceBanner {workPreference} />

		{#if openShifts.length}
			<ul class="grid gap-4 md:grid-cols-2">
				{#each openShifts as shift (shift.recurrenceDay?.id)}
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
				<Button href="/settings/availability" variant="outline">Update availability</Button>
			</EmptyState>
		{/if}
	{:else if active === 'upcoming'}
		{#if split.upcoming.length}
			<ul class="grid gap-4 md:grid-cols-2">
				{#each split.upcoming as shift (shift.workday.id)}
					<li>
						<ShiftCard {shift}>
							{#snippet action()}
								<div class="grid gap-2">
									<Button href={`/my-shifts/${shift.workday.id}`} size="lg" class="w-full">View shift</Button>
									{#if canCancelShift(shift)}
										<CancelShiftButton workdayId={shift.workday.id} />
									{/if}
								</div>
							{/snippet}
						</ShiftCard>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState
				icon={CalendarCheck}
				title="No upcoming shifts"
				description="Shifts you claim will show up here."
			>
				<Button href="/my-shifts?tab=available">Browse available shifts</Button>
			</EmptyState>
		{/if}
	{:else}
		{#if months.length > 1}
			<Select.Root onSelectedChange={(selected) => (month = selected?.value ?? '')}>
				<Select.Trigger class="h-11 sm:w-56" aria-label="Filter by month">
					<Select.Value placeholder="All months" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">All months</Select.Item>
					{#each months as option (option)}
						<Select.Item value={option}>{option}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}

		{#if past.length}
			<ul class="grid gap-4 md:grid-cols-2">
				{#each past as shift (shift.workday.id)}
					<li>
						<ShiftCard {shift}>
							{#snippet action()}
								{#if shift.timesheet?.totalHoursWorked}
									<p class="mb-3 text-sm font-semibold">{shift.timesheet.totalHoursWorked} hours</p>
								{/if}
								<div class="grid gap-2 sm:grid-cols-2">
									<Button href={`/my-shifts/${shift.workday.id}`} variant="outline" size="lg">Details</Button>
									<Button href={shift.timesheet?.id ? `/timesheets/${shift.timesheet.id}` : '/timesheets'} variant="outline" size="lg">
										{shift.timesheet?.id ? 'Timesheet' : 'Timesheets'}
									</Button>
								</div>
							{/snippet}
						</ShiftCard>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState icon={History} title="No past shifts" description="Shifts you've worked will show up here." />
		{/if}
	{/if}
</Page>

<ClaimShiftSheet {claimForm} shift={selectedShift} bind:open={sheetOpen} />
