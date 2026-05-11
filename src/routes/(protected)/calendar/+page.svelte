<script lang="ts">
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { onMount } from 'svelte';
	import type { PageData } from './$types.js';
	import Calendar from '$lib/components/calendar/calendar.svelte';
	import { convertRecurrenceDayToEvent, type CalendarEvent } from '$lib/components/calendar/utils';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { CalendarDays, Clock, CircleDollarSign, MapPin, Tag, Building, Briefcase, GraduationCap } from 'lucide-svelte';	import { Badge } from '$lib/components/ui/badge';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { RecurrenceDayClaimSchema } from '$lib/config/zod-schemas.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { isPast } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';

	type FilterType = 'ALL' | 'OPEN' | 'APPLIED';
	export let data: PageData;
	let mounted: boolean = false;
	let dialogOpen: boolean = false;
	let selectedEvent: CalendarEvent | null = null;

	$: user = data.user;
	$: profile = data.profile;
	let filter: FilterType = 'ALL';
	$: console.log({ selectedEvent });
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
		selectedEvent = event;
		dialogOpen = true;
	};

	const setFilter = (value: string | string[] | undefined) => {
		filter = value as FilterType;
	};

	onMount(() => {
		mounted = true;
	});

	export let applyForm: SuperValidated<RecurrenceDayClaimSchema>;
	const { enhance, submitting } = superForm(applyForm, {
		onResult: ({ result }) => {
			console.log(result);
			if (result.type === 'success') {
				dialogOpen = false;
			}
		}
	});
	$: console.log(selectedEvent)
</script>

<svelte:head>
	<title>Temp Shift Calendar | DentalStaff.US</title>
</svelte:head>

<section class="container grid items-center gap-6 px-4">
	<div class="flex flex-col md:flex-row gap-4 justify-between">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
			Temporary Positions
		</h1>
		<div class="flex gap-2 items-center">
			<p>Filter:</p>
			<ToggleGroup.Root class="justify-start" value={filter} onValueChange={setFilter}>
				<ToggleGroup.Item value="ALL">All</ToggleGroup.Item>
				<ToggleGroup.Item value="OPEN">Open</ToggleGroup.Item>
				<ToggleGroup.Item value="APPLIED">Applied</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
	</div>
	{#if mounted}
		<div class="w-full overflow-scroll">
			<Calendar events={calendarEvents} {selectEvent} />
		</div>
	{/if}
	<Dialog.Root open={dialogOpen} onOpenChange={() => (dialogOpen = !dialogOpen)}>
		<Dialog.Content class="max-w-xl overflow-auto h-full md:h-auto">
			<Dialog.Header>
				<Dialog.Title class="text-xl text-left font-bold">{selectedEvent?.extendedProps.requisition.disciplineName}</Dialog.Title>
				<Dialog.Description>
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
				<div class="space-y-6 py-4">
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
								<Badge
									variant={selectedEvent.extendedProps.recurrenceDay.status === 'OPEN'
										? 'default'
										: 'secondary'}
								>
									{selectedEvent.extendedProps.recurrenceDay.status}
								</Badge>
							</div>
						</div>
					</div>

					{#if selectedEvent.extendedProps.location}
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
					{/if}
				</div>

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
							<Button
								class="bg-blue-800 hover:bg-blue-900 w-full md:w-fit"
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
							class="bg-blue-800 hover:bg-blue-900">View Shift</Button
						>
					{/if}
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</section>
