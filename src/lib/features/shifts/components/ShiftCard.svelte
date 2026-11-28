<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Banknote, CalendarDays, CalendarOff, Lock, MapPin } from 'lucide-svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { payRate } from '$lib/_helpers/hourlyRate';
	import { isPracticeLocked } from '$lib/_helpers/practiceIdentity';
	import { formatShiftDate, formatTimeRange, relativeShiftDay } from '../format';

	let { shift, action }: { shift: any; action: Snippet } = $props();

	const day = $derived(shift.recurrenceDay);
	const requisition = $derived(shift.requisition);
	const timezone = $derived(requisition?.referenceTimezone);
	const pay = $derived(payRate(requisition, shift.timesheet));
	const locked = $derived(isPracticeLocked(shift));
	const practice = $derived(
		shift.company?.name ?? shift.company?.companyName ?? shift.requisition?.companyName
	);
	const place = $derived(
		(!locked && shift.location?.completeAddress) ||
			[shift.location?.city, shift.location?.state].filter(Boolean).join(', ') ||
			(locked ? '' : (shift.location?.name ?? ''))
	);
	const relative = $derived(relativeShiftDay(day?.date, timezone));
</script>

<article class="flex h-full flex-col rounded-xl border bg-card p-5 shadow-card" class:opacity-75={shift.blockedByAvailability}>
	<div class="flex items-center justify-between gap-2">
		<StatusBadge status={day?.status} />
		{#if relative}<span class="text-sm font-bold text-primary-dark">{relative}</span>{/if}
	</div>

	<h3 class="mt-3 text-h3">{requisition?.disciplineName ?? requisition?.discipline}</h3>
	{#if locked}
		<p class="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
			<Lock class="size-3.5" aria-hidden="true" /> Practice shared when you claim
		</p>
	{:else if practice}
		<p class="mt-0.5 text-sm text-muted-foreground">{practice}</p>
	{/if}

	<ul class="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
		<li class="flex items-start gap-2">
			<CalendarDays class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<span>
				{formatShiftDate(day?.date)} · {formatTimeRange(day?.dayStart ?? day?.startTime, day?.dayEnd ?? day?.endTime, timezone)}
			</span>
		</li>
		{#if place}
			<li class="flex items-start gap-2">
				<MapPin class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span>
					{place}{#if shift.location?.distanceMiles != null}{' '}· about {shift.location.distanceMiles} mi{/if}
				</span>
			</li>
		{/if}
		{#if pay.rate}
			<li class="flex items-start gap-2">
				<Banknote class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span class="font-bold text-foreground">${pay.rate}/hr</span>
			</li>
		{/if}
		{#if shift.blockedByAvailability}
			<li class="flex items-start gap-2 font-semibold text-status-warning-fg">
				<CalendarOff class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				{shift.blockedReason === 'WEEKDAY' ? "A weekday you don't work" : 'A day you marked off'}
			</li>
		{/if}
	</ul>

	{#if !locked && requisition?.specialInstructions}
		<p class="mt-3 rounded-lg bg-muted p-3 text-sm">
			<span class="font-bold">Important:</span> {requisition.specialInstructions}
		</p>
	{/if}

	<div class="mt-4">{@render action()}</div>
</article>
