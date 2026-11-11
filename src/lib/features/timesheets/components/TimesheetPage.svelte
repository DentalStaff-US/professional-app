<script lang="ts">
	import { enhance } from '$app/forms';
	import { Building2, Clipboard, LifeBuoy, Loader2, MessageSquare, Utensils } from 'lucide-svelte';
	import ConfirmDialog from '$dtss/ConfirmDialog.svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { formatShiftDate, formatWorkWeek, formatShiftTime } from '$features/shifts';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';
	import { Button } from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import DayHoursRow from './DayHoursRow.svelte';
	import ExpensesCard from './ExpensesCard.svelte';
	import MessagePracticeDialog from './MessagePracticeDialog.svelte';
	import {
		buildEntries,
		entryProblem,
		lastShiftStarted,
		splitOvertime,
		workedHours,
		type TimeEntry
	} from '../hours';
	import { TIMESHEET_STATUS_HINTS, TIMESHEET_STATUS_MESSAGE } from '../hints';

	let {
		timesheet,
		requisition,
		company,
		conversationId = null,
		canMessagePractice = false,
		workdays,
		expenses,
		addExpenseForm
	}: {
		timesheet: any;
		requisition: any;
		company: any;
		conversationId?: string | null;
		canMessagePractice?: boolean;
		workdays: any[];
		expenses: any[];
		addExpenseForm: any;
	} = $props();

	const timezone = $derived(requisition?.referenceTimezone || 'America/New_York');
	const status = $derived(timesheet?.status);
	const isDraft = $derived(status === 'DRAFT');
	const canAddExpenses = $derived(['DRAFT', 'PENDING', 'DISCREPANCY'].includes(status));

	let entries = $state<Record<string, TimeEntry>>(
		buildEntries(workdays ?? [], timesheet?.hoursRaw, requisition?.referenceTimezone || 'America/New_York')
	);

	const days = $derived(
		(workdays ?? [])
			.filter((workday) => workday?.recurrenceDay?.date)
			.map((workday) => ({
				date: workday.recurrenceDay.date as string,
				start: workday.recurrenceDay.dayStart as string | undefined
			}))
			.sort((a, b) => a.date.localeCompare(b.date))
	);

	const totalHours = $derived(Object.values(entries).reduce((sum, entry) => sum + (entry.hours || 0), 0));
	const split = $derived(splitOvertime(totalHours, Number(timesheet?.priorWeekHours ?? 0)));
	const problems = $derived(Object.values(entries).filter((entry) => entryProblem(entry)).length);
	const shiftsStarted = $derived(lastShiftStarted(workdays ?? []));
	const canSubmit = $derived(totalHours > 0 && shiftsStarted && problems === 0);
	const blockedReason = $derived(
		totalHours === 0
			? 'Enter your hours to submit.'
			: !shiftsStarted
				? 'You can submit once your last shift on this timesheet has started.'
				: problems
					? `Fix ${problems === 1 ? 'the highlighted day' : `the ${problems} highlighted days`} to submit.`
					: ''
	);
	const entriesJson = $derived(JSON.stringify(entries));

	const isStarted = (start?: string) => Boolean(start) && new Date() > new Date(start!);

	function updateEntry(date: string, field: 'startTime' | 'endTime' | 'lunchStartTime' | 'lunchEndTime', value: string) {
		const entry = { ...entries[date], [field]: value };
		entry.hours = workedHours(entry.startTime, entry.endTime, entry.lunchStartTime, entry.lunchEndTime);
		entries[date] = entry;
	}

	let submitOpen = $state(false);
	let surveyOpen = $state(false);
	let messageOpen = $state(false);
	let saving = $state(false);
	let submitting = $state(false);
</script>

<svelte:head><title>Timesheet | DTSS</title></svelte:head>

<Page>
	{#if !timesheet}
		<EmptyState
			icon={Clipboard}
			title="We couldn't load this timesheet"
			description="Please try again in a moment."
		>
			<Button href="/timesheets" variant="outline">Back to timesheets</Button>
		</EmptyState>
	{:else}
		<header>
			<StatusBadge {status} hint={TIMESHEET_STATUS_HINTS[status]} />
			<h1 class="mt-3 text-h1">{formatWorkWeek(timesheet.weekBeginDate)}</h1>
			<p class="mt-1 text-muted-foreground">
				{[requisition?.disciplineName, company?.name].filter(Boolean).join(' · ')}
			</p>
			<p class="text-sm text-muted-foreground">Times are in {formatTimezoneName(timezone)} time.</p>
		</header>

		{#if status === 'DISCREPANCY'}
			<!-- Admins correct returned timesheets, so there's nothing to edit here. -->
			<Notice tone="warning" title="These hours are being reviewed">
				<p class="whitespace-pre-wrap">{timesheet.discrepancyNote || 'No notes provided.'}</p>
				<p class="mt-2">An admin will follow up with any corrections. There's nothing you need to do here.</p>
			</Notice>
		{:else if TIMESHEET_STATUS_MESSAGE[status]}
			<Notice tone={status === 'APPROVED' ? 'positive' : status === 'PENDING' ? 'pending' : 'negative'}>
				{TIMESHEET_STATUS_MESSAGE[status]}
			</Notice>
		{/if}

		<div class="grid gap-6 md:grid-cols-3">
			<div class="space-y-6 md:col-span-2">
				<section class="rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="hours-heading">
					<h2 id="hours-heading" class="text-h3">Daily hours</h2>
					{#if isDraft}
						<p class="mt-1 text-sm text-muted-foreground">
							Save as you go: clock-in, lunch and clock-out. Lunch is unpaid and comes out of your hours automatically.
						</p>
						{#if days.length}
							<div class="mt-4 space-y-3">
								{#each days as day (day.date)}
									{#if entries[day.date]}
										<DayHoursRow
											date={day.date}
											label={formatShiftDate(`${day.date}T00:00:00Z`)}
											entry={entries[day.date]}
											started={isStarted(day.start)}
											showProblem={true}
											onchange={(field, value) => updateEntry(day.date, field, value)}
										/>
									{/if}
								{/each}
							</div>
						{:else}
							<p class="mt-4 text-sm text-muted-foreground">No scheduled shifts found for this week.</p>
						{/if}
					{:else if timesheet.hoursRaw?.length}
						<ul class="mt-3 divide-y">
							{#each timesheet.hoursRaw as entry (entry.date)}
								<li class="py-3">
									<div class="flex items-center justify-between gap-3">
										<p class="font-bold">{formatShiftDate(`${entry.date}T00:00:00Z`)}</p>
										<p class="font-bold tabular-nums">{entry.hours} hrs</p>
									</div>
									<p class="text-sm text-muted-foreground">
										{formatShiftTime(entry.startTime, timezone)}–{formatShiftTime(entry.endTime, timezone)}
									</p>
									{#if entry.lunchStartTime && entry.lunchEndTime}
										<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
											<Utensils class="size-3.5" aria-hidden="true" />
											Lunch {formatShiftTime(entry.lunchStartTime, timezone)}–{formatShiftTime(entry.lunchEndTime, timezone)}
										</p>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-3 text-sm text-muted-foreground">No hours recorded for this timesheet.</p>
					{/if}
				</section>

				<ExpensesCard {expenses} canAdd={canAddExpenses} form={addExpenseForm} />
			</div>

			<aside class="space-y-4">
				<section class="rounded-lg border bg-card p-5 shadow-card" aria-labelledby="summary-heading">
					<h2 id="summary-heading" class="font-bold">Summary</h2>
					<dl class="mt-3 space-y-2 text-sm">
						<div class="flex justify-between gap-3"><dt class="text-muted-foreground">Regular</dt><dd class="font-semibold tabular-nums">{split.regular.toFixed(2)} hrs</dd></div>
						<div class="flex justify-between gap-3"><dt class="text-muted-foreground">Overtime</dt><dd class="font-semibold tabular-nums">{split.overtime.toFixed(2)} hrs</dd></div>
						<div class="flex justify-between gap-3 border-t pt-2 text-base"><dt class="font-bold">Total</dt><dd class="font-extrabold tabular-nums">{totalHours.toFixed(2)} hrs</dd></div>
						{#if requisition?.hourlyRate}
							<div class="flex justify-between gap-3"><dt class="text-muted-foreground">Base rate</dt><dd class="font-semibold tabular-nums">${requisition.hourlyRate}/hr</dd></div>
						{/if}
					</dl>
				</section>

				<section class="rounded-lg border bg-card p-5 shadow-card" aria-label="Practice">
					<div class="flex items-center gap-3">
						{#if company?.logo}
							<img src={company.logo} alt="" class="size-12 shrink-0 rounded-lg border bg-white object-contain p-1" />
						{:else}
							<span class="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
								<Building2 class="size-5" aria-hidden="true" />
							</span>
						{/if}
						<p class="min-w-0 font-bold">{company?.name ?? 'Practice'}</p>
					</div>
					<!-- Opens the existing thread, or starts one: a timesheet shows they've
					     worked here. Hidden when either side has blocked the other. -->
					{#if conversationId}
						<Button href="/inbox/{conversationId}" variant="outline" class="mt-4 min-h-11 w-full">
							<MessageSquare class="mr-2 size-4" aria-hidden="true" /> Message the practice
						</Button>
					{:else if canMessagePractice}
						<Button variant="outline" class="mt-4 min-h-11 w-full" on:click={() => (messageOpen = true)}>
							<MessageSquare class="mr-2 size-4" aria-hidden="true" /> Message the practice
						</Button>
					{/if}
				</section>

				{#if status === 'PENDING'}
					<Button variant="outline" size="lg" class="w-full" on:click={() => (surveyOpen = true)}>Rate your experience</Button>
				{/if}

				<a href="/settings/support" class="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-5 font-bold shadow-card hover:shadow-lift">
					<LifeBuoy class="size-5 shrink-0 text-primary-dark" aria-hidden="true" /> Need help? Contact support
				</a>
			</aside>
		</div>

		{#if isDraft}
			<!-- Keeps the total and Submit in reach while entering a long week. -->
			<div class="h-24 md:hidden" aria-hidden="true"></div>
			<div class="fixed inset-x-0 bottom-[var(--tabbar-offset,0px)] z-20 border-t bg-card/95 p-3 backdrop-blur md:sticky md:bottom-0 md:rounded-lg md:border md:shadow-card">
				<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
					<p class="mr-auto text-sm">
						<span class="font-extrabold tabular-nums">{totalHours.toFixed(2)} hrs</span>
						{#if blockedReason}<span class="block text-muted-foreground">{blockedReason}</span>{/if}
					</p>
					<form
						method="POST"
						action="?/saveDraftTimesheet"
						use:enhance={() => {
							saving = true;
							return async ({ update }) => {
								await update({ reset: false });
								saving = false;
							};
						}}
					>
						<input type="hidden" name="entries" value={entriesJson} />
						<input type="hidden" name="totalHours" value={totalHours} />
						<Button type="submit" variant="outline" size="lg" disabled={saving}>
							{#if saving}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
							Save
						</Button>
					</form>
					<Button size="lg" disabled={!canSubmit} on:click={() => (submitOpen = true)}>Submit week</Button>
				</div>
			</div>
		{/if}
	{/if}
</Page>

<ConfirmDialog
	bind:open={submitOpen}
	title="Submit this timesheet?"
	description={`${totalHours.toFixed(2)} hours for ${formatWorkWeek(timesheet?.weekBeginDate)}${split.overtime > 0 ? `, including ${split.overtime.toFixed(2)} overtime` : ''}. It goes for approval and you won't be able to edit it.`}
	cancelLabel="Keep editing"
>
	{#snippet confirm()}
		<form
			method="POST"
			action="?/submitTimesheet"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					submitting = false;
					submitOpen = false;
					// The action reports refusals as a 200 with success: false.
					if (result.type === 'success' && result.data?.success) surveyOpen = true;
				};
			}}
		>
			<input type="hidden" name="entries" value={entriesJson} />
			<input type="hidden" name="totalHours" value={totalHours} />
			<Button type="submit" class="min-h-11 w-full sm:min-h-10" disabled={submitting}>
				{#if submitting}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
				Submit
			</Button>
		</form>
	{/snippet}
</ConfirmDialog>

{#if !conversationId && canMessagePractice}
	<MessagePracticeDialog practiceName={company?.name ?? 'the practice'} bind:open={messageOpen} />
{/if}

<!-- Outside the draft block, so it survives the status changing on submit. "No" hides
     this practice's jobs from this professional. -->
<AlertDialog.Root bind:open={surveyOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Quick question</AlertDialog.Title>
			<AlertDialog.Description>Would you keep working with {company?.name ?? 'this practice'}?</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="gap-2">
			<form method="POST" action="?/submitExperienceSurvey" use:enhance class="w-full sm:w-auto">
				<input type="hidden" name="companyId" value={company?.id ?? ''} />
				<Button type="submit" variant="outline" class="min-h-11 w-full sm:min-h-10" on:click={() => (surveyOpen = false)}>
					No, don't show me their jobs
				</Button>
			</form>
			<Button class="min-h-11 sm:min-h-10" on:click={() => (surveyOpen = false)}>Yes</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
