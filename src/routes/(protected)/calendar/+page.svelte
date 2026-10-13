<script lang="ts">
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { onMount } from 'svelte';
	import type { PageData } from './$types.js';
	import Calendar from '$lib/components/calendar/calendar.svelte';
	import { convertRecurrenceDayToEvent, type CalendarEvent } from '$lib/components/calendar/utils';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { CalendarDays, Clock, CircleDollarSign, MapPin, Tag, Building, Briefcase, GraduationCap } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { StatusBadge } from '$lib/components/ui/status-badge';
	import { superForm } from 'sveltekit-superforms/client';
	import { isPast } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';
	import LockedPracticeDetails from '$lib/components/general/LockedPracticeDetails.svelte';
	import { isPracticeLocked } from '$lib/_helpers/practiceIdentity';
	import AvailabilityEditor from '$lib/components/availability/AvailabilityEditor.svelte';
	import AvailabilityHiddenBanner from '$lib/components/availability/AvailabilityHiddenBanner.svelte';
	import WorkPreferenceBanner from '$lib/components/workPreference/WorkPreferenceBanner.svelte';
	import type { AvailabilityState } from '$lib/components/availability/availability';
	import { CalendarCheck } from 'lucide-svelte';

	type FilterType = 'ALL' | 'OPEN' | 'APPLIED';
	export let data: PageData;
	let mounted: boolean = false;
	let dialogOpen: boolean = false;
	let selectedEvent: CalendarEvent | null = null;

	$: user = data.user;
	$: profile = data.profile;
	let filter: FilterType = 'ALL';
	// First convert all events
	$: convertedEvents = data.recurrenceDays.map((recurrenceDay: any) =>
		convertRecurrenceDayToEvent(recurrenceDay)
	);

	// Then filter them in a separate derived store
	$: calendarEvents = convertedEvents.filter((event) => {
		switch (filter) {
			case 'OPEN':
				return event.extendedProps.recurrenceDay.status === 'OPEN';
			case 'APPLIED':
				return event.extendedProps.workday?.candidateId === profile?.id;
			case 'ALL':
			default:
				return true;
		}
	});

	const selectEvent = (event: CalendarEvent) => {
		// The dialog header dereferences extendedProps.requisition and .company
		// unguarded, so anything that is not a recurrence day must not open it.
		if (event?.extendedProps?.type !== 'RECURRENCE_DAY') return;
		selectedEvent = event;
		dialogOpen = true;
	};

	// ── Availability ─────────────────────────────────────────────────────────────
	// A MODE, not an overlay. In shift mode a tap means "tell me about this shift";
	// in availability mode it means "I can't work this day". Same pixels, two
	// meanings, and here the mistake silently removes someone's work — so the two
	// never share a grid.
	let editingAvailability = false;
	/** Preserved across the mode switch rather than reset. */
	let filterBeforeEditing: FilterType = 'ALL';

	const availabilityForm = superForm(data.availabilityForm, {
		dataType: 'json',
		id: 'availability',
		onResult: ({ result }) => {
			if (result.type === 'success' || result.type === 'redirect') editingAvailability = false;
		}
	});
	const {
		enhance: availabilityEnhance,
		submitting: availabilitySubmitting,
		form: availabilityData
	} = availabilityForm;

	let availabilityFormEl: HTMLFormElement;

	function enterEditing() {
		filterBeforeEditing = filter;
		editingAvailability = true;
	}

	function exitEditing() {
		editingAvailability = false;
		filter = filterBeforeEditing;
	}

	function saveAvailability(state: AvailabilityState) {
		$availabilityData.availableDays = state.availableDays;
		$availabilityData.blockedDates = state.blockedDates;
		availabilityFormEl.requestSubmit();
	}

	$: blockedShiftCount = data.hiddenByAvailability ?? 0;

	const setFilter = (value: string | string[] | undefined) => {
		filter = value as FilterType;
	};

	onMount(() => {
		mounted = true;
	});

	// The id is explicit because this page runs a second superForm (availability).
	// Two forms both defaulting to an undefined id cross-wire on the single `form`
	// prop and trip superforms' duplicate-id path.
	const { enhance, submitting, errors } = superForm(data.claimForm, {
		id: 'claim-shift',
		onResult: ({ result }) => {
			if (result.type === 'success') {
				dialogOpen = false;
			}
		}
	});
</script>

<svelte:head>
	<title>Temp Shift Calendar | DTSS</title>
</svelte:head>

<section class="container grid items-center gap-6 px-4">
	<div class="flex flex-col md:flex-row gap-4 justify-between">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
			Temporary Positions
		</h1>
		<div class="flex flex-wrap gap-2 items-center">
			{#if !editingAvailability}
				<!-- Hidden (not merely disabled) while editing: visible-but-inert is worse
				     than absent, and the filter describes a shift's relationship to YOU
				     while availability describes the DAY — conflating them would make
				     "Open" ambiguous. -->
				<p>Filter:</p>
				<ToggleGroup.Root class="justify-start" value={filter} onValueChange={setFilter}>
					<ToggleGroup.Item value="ALL">All</ToggleGroup.Item>
					<ToggleGroup.Item value="OPEN">Open</ToggleGroup.Item>
					<ToggleGroup.Item value="APPLIED">Applied</ToggleGroup.Item>
				</ToggleGroup.Root>
			{/if}
			<Button
				variant="outline"
				class="gap-2"
				disabled={!data.availabilityLoaded}
				title={data.availabilityLoaded
					? undefined
					: "We couldn't load your availability. Refresh and try again."}
				on:click={() => (editingAvailability ? exitEditing() : enterEditing())}
			>
				<CalendarCheck class="h-4 w-4" />
				{editingAvailability ? 'Done editing' : 'Edit availability'}
			</Button>
		</div>
	</div>

	<WorkPreferenceBanner workPreference={data.workPreference} />

	<AvailabilityHiddenBanner
		hiddenCount={blockedShiftCount}
		showingUnavailable={data.showUnavailable}
		basePath="/calendar"
		onEdit={editingAvailability ? null : enterEditing}
		editDisabled={!data.availabilityLoaded}
	/>

	{#if editingAvailability}
		<div class="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
			Editing your availability. Tap a date to mark a day you can't work.
		</div>
		<!-- Deliberately NOT inside the overflow-scroll wrapper below: the tap grid
		     must FIT at phone width, not scroll sideways. -->
		<form
			method="POST"
			action="?/saveAvailability"
			use:availabilityEnhance
			bind:this={availabilityFormEl}
		>
			<AvailabilityEditor
				initialAvailableDays={data.availabilityForm.data.availableDays}
				initialBlockedDates={data.availabilityForm.data.blockedDates}
				bookedDates={data.bookedDates}
				today={data.today}
				loaded={data.availabilityLoaded}
				submitting={$availabilitySubmitting}
				onSave={saveAvailability}
			/>
		</form>
	{:else if mounted}
		<div class="w-full overflow-scroll">
			<Calendar events={calendarEvents} {selectEvent} />
		</div>
	{/if}
	<Dialog.Root open={dialogOpen} onOpenChange={() => (dialogOpen = !dialogOpen)}>
		<Dialog.Content class="max-w-xl overflow-auto h-full md:h-auto">
			<Dialog.Header>
				<Dialog.Title class="text-xl text-left font-bold">{selectedEvent?.extendedProps.requisition.disciplineName}</Dialog.Title>
				<Dialog.Description>
					{#if isPracticeLocked(selectedEvent?.extendedProps)}
						<div class="py-2">
							<LockedPracticeDetails
								city={selectedEvent?.extendedProps.location?.city}
								state={selectedEvent?.extendedProps.location?.state}
								distanceMiles={selectedEvent?.extendedProps.location?.distanceMiles}
								unlockMessage="Claim this shift to see the practice name, address and contact details."
							/>
						</div>
					{:else}
					<div class="flex items-center gap-3 py-2">
						{#if selectedEvent?.extendedProps.company.logo}
                            <img
                                    src={selectedEvent?.extendedProps.company.logo}
                                    alt={`${selectedEvent?.extendedProps.company.name} logo`}
                                    class="w-12 h-12 rounded-lg shadow-lg object-cover"
                            />
                        {:else}
                            <div class="h-12 w-12 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
                                <Building class="h-8 w-8"/>
                            </div>
                        {/if}
						<div class="flex flex-col">
							<span class="font-medium">{selectedEvent?.extendedProps.company.name}</span>
						</div>
					</div>
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if selectedEvent?.extendedProps.type === 'RECURRENCE_DAY'}
				{@const eventTimezone =
					selectedEvent.extendedProps.requisition?.referenceTimezone || 'America/New_York'}
				{@const recurrenceDate = selectedEvent.extendedProps.recurrenceDay?.date}
				{@const utcStart =
					selectedEvent.extendedProps.recurrenceDay?.dayStart ??
					selectedEvent.extendedProps.recurrenceDay?.startTime}
				{@const utcEnd =
					selectedEvent.extendedProps.recurrenceDay?.dayEnd ??
					selectedEvent.extendedProps.recurrenceDay?.endTime}
				{@const isCancelled =
					selectedEvent.extendedProps.recurrenceDay?.status === 'CANCELED'}
				<div class="space-y-6 py-4">
					{#if isCancelled}
						<div
							class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
						>
							<p class="font-semibold">This shift was cancelled.</p>
							<p>The position is no longer happening — you do not need to show up.</p>
						</div>
					{/if}
					<div class="space-y-3">
						<p class="font-semibold text-lg">Schedule Details</p>
						<div class="space-y-2">
							<div class="flex items-center gap-2 text-gray-600">
								<CalendarDays size={18} />
								<span
									>{recurrenceDate
										? new Date(recurrenceDate).toLocaleDateString('en-US', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												timeZone: 'UTC'
											})
										: ''}</span
								>
							</div>
							<div class="flex items-center gap-2 text-gray-600">
								<Clock size={18} />
								<span>
									{utcStart ? formatInTimeZone(utcStart, eventTimezone, 'p') : ''} - {utcEnd
										? formatInTimeZone(utcEnd, eventTimezone, 'p')
										: ''}
									<span class="text-xs">({formatTimezoneName(eventTimezone)})</span>
								</span>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<p class="font-semibold text-lg">Position Details</p>
						<div class="space-y-3">
							<p class="font-semibold text-lg">Requirements</p>
							<div class="space-y-2">
								{#if selectedEvent.extendedProps.requisition.disciplineName}
									<div class="flex items-center gap-2 text-gray-600">
										<Briefcase size={18} />
										<span>{selectedEvent.extendedProps.requisition.disciplineName}</span>
									</div>
								{/if}
								<div class="flex items-center gap-2 text-gray-600">
									<GraduationCap size={18} />
									<span
										>{selectedEvent.extendedProps.requisition.experienceLevelName ??
											'No Preference'}</span
									>
								</div>
							</div>
</div>
						<div class="grid grid-cols-2 gap-4">
							<div class="flex items-center gap-2 text-gray-600">
								<CircleDollarSign size={18} />
								<span>${selectedEvent.extendedProps.requisition.hourlyRate}/hr</span>
							</div>
							<div class="flex items-center gap-2 text-gray-600">
								<Tag size={18} />
								<StatusBadge status={selectedEvent.extendedProps.recurrenceDay.status} />
							</div>
						</div>
					</div>

					{#if selectedEvent.extendedProps.location && !isPracticeLocked(selectedEvent.extendedProps)}
						<div class="space-y-3">
							<p class="font-semibold text-lg">Location</p>
							<div class="flex items-center gap-2 text-gray-600">
								<MapPin size={18} />
								<div>
									<p>
										{selectedEvent.extendedProps.location.name}
									</p>
									<p class="text-sm text-gray-600">
										{selectedEvent.extendedProps
												.location.completeAddress}
									</p>
								</div>
							</div>
						</div>
					{:else if selectedEvent.extendedProps.location}
						<div class="space-y-3">
							<p class="font-semibold text-lg">Location</p>
							<div class="flex items-center gap-2 text-gray-600">
								<MapPin size={18} />
								<p>
									{[
										selectedEvent.extendedProps.location.city,
										selectedEvent.extendedProps.location.state
									]
										.filter(Boolean)
										.join(', ')}
									{#if selectedEvent.extendedProps.location.distanceMiles != null}
										· ~{selectedEvent.extendedProps.location.distanceMiles} mi away
									{/if}
								</p>
							</div>
							<p class="text-xs text-gray-500">
								The exact address is shared as soon as you claim the shift.
							</p>
						</div>
					{/if}
				</div>

				{#if selectedEvent.extendedProps.blockedByAvailability}
					<div class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
						<p class="font-semibold">
							{selectedEvent.extendedProps.blockedReason === 'WEEKDAY'
								? "This falls on a weekday you don't work."
								: 'You marked this day as unavailable.'}
						</p>
						<p>
							You can still claim this shift. Claiming it doesn't change your availability — if
							you want the day back, edit it on the calendar.
						</p>
					</div>
				{/if}

				{#if $errors._errors?.length}
					<p
						class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
						role="alert"
					>
						{$errors._errors[0]}
					</p>
				{/if}

				<Dialog.Footer class="flex gap-2 justify-end">
					<Button variant="outline" type="button" on:click={() => (dialogOpen = false)}>
						Close
					</Button>
					{#if !isPast(new Date(selectedEvent.start)) && selectedEvent.extendedProps.recurrenceDay.status === 'OPEN'}
						<form method="POST" action="?/claimWorkdayShift" use:enhance>
							<input
								type="hidden"
								name="recurrenceDayId"
								value={selectedEvent.extendedProps.recurrenceDay.id}
							/>
							<!-- The admin app refuses a blocked day unless the override is
							     explicit. Set only when the professional is looking at a shift
							     they asked to be shown. -->
							<input
								type="hidden"
								name="acknowledgeUnavailable"
								value={selectedEvent.extendedProps.blockedByAvailability ? 'true' : 'false'}
							/>
							<Button
								class="bg-primary hover:bg-primary/90 w-full md:w-fit"
								type="submit"
								disabled={selectedEvent.extendedProps.recurrenceDay.status !== 'OPEN' ||
									$submitting ||
									isPast(selectedEvent.end)}
							>
								{#if $submitting}
									Claiming...
								{:else if isPast(selectedEvent.end)}
									Unable to claim
								{:else}
									{selectedEvent.extendedProps.recurrenceDay.status === 'OPEN' && 'Claim Shift'}
								{/if}
							</Button>
						</form>
					{/if}
					{#if selectedEvent.extendedProps.recurrenceDay.status === 'FILLED'}
						<Button
							href={`/my-shifts/${selectedEvent.extendedProps?.workday?.id}`}
							class="bg-primary hover:bg-primary/90">View Shift</Button
						>
					{/if}
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</section>
