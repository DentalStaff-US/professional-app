<script lang="ts">
	import {
		Banknote,
		CalendarDays,
		CalendarPlus,
		ClipboardList,
		LifeBuoy,
		Mail,
		MapPin,
		Navigation,
		Phone
	} from 'lucide-svelte';
	import IconSquare from '$dtss/IconSquare.svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { payRate } from '$lib/_helpers/hourlyRate';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';
	import { MessagePracticeButton } from '$features/inbox';
	import { Button } from '$lib/components/ui/button';
	import CancelShiftButton from './CancelShiftButton.svelte';
	import { directionsUrl, formatShiftDate, formatTimeRange } from '../format';
	import { buildShiftIcs, icsDataUrl } from '../ics';
	import { canCancelShift } from '../split';

	let { shift }: { shift: any | null } = $props();

	const day = $derived(shift?.recurrenceDay);
	const requisition = $derived(shift?.requisition);
	const location = $derived(shift?.location);
	const pay = $derived(payRate(requisition, shift?.timesheet));
	const timezone = $derived(requisition?.referenceTimezone || 'America/New_York');
	const title = $derived(requisition?.disciplineName ?? requisition?.discipline ?? 'Shift');
	const practice = $derived(requisition?.companyName ?? shift?.company?.name);
	const cancelled = $derived(day?.status === 'CANCELED' || Boolean(shift?.workday?.cancelledAt));
	const canMessage = $derived(Boolean(shift?.conversationId || shift?.canMessagePractice));
	const upcoming = $derived(Boolean(day?.dayStart) && new Date(day.dayStart) > new Date());
	const ics = $derived(
		shift && upcoming && !cancelled
			? icsDataUrl(
					buildShiftIcs({
						id: shift.workday.id,
						title: [title, practice].filter(Boolean).join(', '),
						start: day.dayStart,
						end: day.dayEnd,
						location: location?.completeAddress
					})
				)
			: null
	);
</script>

<svelte:head><title>Shift details | DTSS</title></svelte:head>

<Page>
	{#if !shift}
		<EmptyState
			icon={CalendarDays}
			title="We couldn't load this shift"
			description="Please try again in a moment. Your other shifts are still on the Shifts tab."
		>
			<Button href="/my-shifts?tab=upcoming" variant="outline">Back to shifts</Button>
		</EmptyState>
	{:else}
		{#if cancelled}
			<Notice tone="negative" title="This shift was cancelled">You don't need to show up.</Notice>
		{/if}

		<header>
			<StatusBadge status={day?.status} />
			<h1 class="mt-3 text-h1">{title}</h1>
			{#if practice}<p class="mt-1 text-lg text-muted-foreground">{practice}</p>{/if}
		</header>

		<div class="grid gap-6 md:grid-cols-3">
			<section class="space-y-5 rounded-lg border bg-card p-5 shadow-card sm:p-6 md:col-span-2" aria-label="Shift details">
				<div class="flex items-start gap-4">
					<IconSquare icon={CalendarDays} />
					<div>
						<h2 class="font-bold">{formatShiftDate(day?.date, true)}</h2>
						<p class="text-muted-foreground">
							{formatTimeRange(day?.dayStart, day?.dayEnd, timezone)}
							<span class="text-sm">({formatTimezoneName(timezone)} time)</span>
						</p>
					</div>
				</div>
				{#if location}
					<div class="flex items-start gap-4">
						<IconSquare icon={MapPin} />
						<div>
							<h2 class="font-bold">{location.name}</h2>
							<p class="text-muted-foreground">{location.completeAddress}</p>
						</div>
					</div>
				{/if}
				{#if pay.rate !== null}
					<div class="flex items-start gap-4">
						<IconSquare icon={Banknote} />
						<div>
							<h2 class="font-bold">${pay.rate.toFixed(2)} per hour</h2>
						</div>
					</div>
				{/if}

				{#if !cancelled && (location?.completeAddress || ics)}
					<div class="flex flex-wrap gap-2 border-t pt-5">
						{#if location?.completeAddress}
							<Button href={directionsUrl(location.completeAddress)} target="_blank" rel="noopener">
								<Navigation class="mr-2 size-4" aria-hidden="true" /> Directions
							</Button>
						{/if}
						{#if ics}
							<Button href={ics} download="dtss-shift.ics" variant="outline">
								<CalendarPlus class="mr-2 size-4" aria-hidden="true" /> Add to calendar
							</Button>
						{/if}
					</div>
				{/if}

				{#if requisition?.jobDescription}
					<div class="border-t pt-5">
						<h2 class="font-bold">About this shift</h2>
						<p class="mt-1 whitespace-pre-wrap text-muted-foreground">{requisition.jobDescription}</p>
					</div>
				{/if}

				{#if requisition?.specialInstructions}
					<Notice tone="info" title="Important notes">
						<span class="whitespace-pre-wrap">{requisition.specialInstructions}</span>
					</Notice>
				{/if}

				{#if canCancelShift(shift)}
					<div class="border-t pt-5 sm:max-w-xs">
						<CancelShiftButton workdayId={shift.workday.id} />
					</div>
				{/if}
			</section>

			<aside class="space-y-4">
				{#if location?.companyPhone || location?.email || canMessage}
					<section class="rounded-lg border bg-card p-5 shadow-card">
						<h2 class="font-bold">Contact the practice</h2>
						<MessagePracticeButton
							conversationId={shift.conversationId}
							canMessage={shift.canMessagePractice === true}
							practiceName={practice}
							reason="You've claimed a shift here, so you can message the practice directly."
							class="mt-3"
						/>
						{#if location?.companyPhone || location?.email}
							<ul class="mt-2">
								{#if location.companyPhone}
									<li>
										<a href={`tel:${location.companyPhone}`} class="flex min-h-11 items-center gap-3 font-semibold text-primary-dark hover:underline">
											<Phone class="size-5 shrink-0" aria-hidden="true" /> {location.companyPhone}
										</a>
									</li>
								{/if}
								{#if location.email}
									<li>
										<a href={`mailto:${location.email}`} class="flex min-h-11 items-center gap-3 break-all font-semibold text-primary-dark hover:underline">
											<Mail class="size-5 shrink-0" aria-hidden="true" /> {location.email}
										</a>
									</li>
								{/if}
							</ul>
						{/if}
					</section>
				{/if}

				{#if shift.timesheet?.id}
					<a href={`/timesheets/${shift.timesheet.id}`} class="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-5 font-bold shadow-card hover:shadow-lift">
						<ClipboardList class="size-5 shrink-0 text-primary-dark" aria-hidden="true" /> View timesheet
					</a>
				{/if}

				<a href="/settings/support" class="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-5 font-bold shadow-card hover:shadow-lift">
					<LifeBuoy class="size-5 shrink-0 text-primary-dark" aria-hidden="true" /> Need help? Contact support
				</a>
			</aside>
		</div>
	{/if}
</Page>
