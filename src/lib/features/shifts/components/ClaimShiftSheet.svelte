<script lang="ts">
	import { isPast } from 'date-fns';
	import { superForm } from 'sveltekit-superforms/client';
	import { Banknote, Briefcase, CalendarDays, GraduationCap, Loader2, MapPin } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';
	import { isPracticeLocked } from '$lib/_helpers/practiceIdentity';
	import LockedPracticeDetails from '$lib/components/general/LockedPracticeDetails.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { formatShiftDate, formatTimeRange } from '../format';

	let {
		claimForm,
		shift,
		open = $bindable(false)
	}: { claimForm: any; shift: any; open?: boolean } = $props();

	const { enhance, submitting, errors } = superForm(claimForm, {
		id: 'claim-shift',
		onResult: ({ result }) => {
			if (result.type === 'success') open = false;
		}
	});

	const day = $derived(shift?.recurrenceDay);
	const requisition = $derived(shift?.requisition);
	const timezone = $derived(requisition?.referenceTimezone);
	const locked = $derived(isPracticeLocked(shift));
	const start = $derived(day?.dayStart ?? day?.startTime);
	const claimable = $derived(day?.status === 'OPEN' && !!start && !isPast(new Date(start)));
</script>

<Dialog.Root bind:open>
	<!-- A bottom sheet on phones, so the claim button stays in thumb reach. -->
	<Dialog.Content
		class="bottom-0 left-0 top-auto max-h-[90dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-2xl p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
	>
		{#if shift}
			<div class="space-y-5 p-6">
				<Dialog.Header class="space-y-3 text-left">
					<div><StatusBadge status={day?.status} /></div>
					<Dialog.Title class="text-h2">{requisition?.disciplineName}</Dialog.Title>
					<Dialog.Description>
						{#if locked}
							<LockedPracticeDetails
								city={shift.location?.city}
								state={shift.location?.state}
								distanceMiles={shift.location?.distanceMiles}
								unlockMessage="Claim this shift to see the practice name, address and contact details."
							/>
						{:else}
							<span class="font-semibold text-foreground">{shift.company?.name}</span>
						{/if}
					</Dialog.Description>
				</Dialog.Header>

				<ul class="space-y-3 text-sm">
					<li class="flex gap-3">
						<CalendarDays class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						<span>
							<span class="block font-semibold">{formatShiftDate(day?.date, true)}</span>
							{formatTimeRange(start, day?.dayEnd ?? day?.endTime, timezone)}
							<span class="text-muted-foreground">({formatTimezoneName(timezone || 'America/New_York')})</span>
						</span>
					</li>
					{#if requisition?.hourlyRate}
						<li class="flex gap-3">
							<Banknote class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
							<span class="font-bold">${requisition.hourlyRate}/hr</span>
						</li>
					{/if}
					<li class="flex gap-3">
						<Briefcase class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						{requisition?.disciplineName}
					</li>
					<li class="flex gap-3">
						<GraduationCap class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						Experience: {requisition?.experienceLevelName ?? 'No preference'}
					</li>
					{#if shift.location && !locked}
						<li class="flex gap-3">
							<MapPin class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
							<span>
								<span class="block font-semibold">{shift.location.name}</span>
								{shift.location.completeAddress}
							</span>
						</li>
					{/if}
				</ul>

				{#if $errors._errors?.length}
					<Notice tone="negative" alert>{$errors._errors[0]}</Notice>
				{/if}

				{#if shift.blockedByAvailability}
					<Notice
						tone="warning"
						title={shift.blockedReason === 'WEEKDAY'
							? "This falls on a weekday you don't work"
							: 'You marked this day as unavailable'}
					>
						You can still claim this shift. Claiming it doesn't change your availability, which you
						can edit under Me.
					</Notice>
				{/if}
			</div>

			<div class="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-4">
				<Button variant="outline" size="lg" on:click={() => (open = false)}>Close</Button>
				{#if claimable}
					<form method="POST" action="?/claimWorkdayShift" use:enhance class="contents">
						<input type="hidden" name="recurrenceDayId" value={day?.id} />
						<!-- Set only when the shift is on a day they marked off, so the
						     override stays explicit on the server. -->
						<input type="hidden" name="acknowledgeUnavailable" value={shift.blockedByAvailability ? 'true' : 'false'} />
						<Button type="submit" size="lg" disabled={$submitting}>
							{#if $submitting}
								<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" /> Claiming…
							{:else}
								Claim shift
							{/if}
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
