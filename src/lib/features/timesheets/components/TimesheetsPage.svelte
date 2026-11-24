<script lang="ts">
	import { ChevronRight, Clipboard, Building2 } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { formatWorkWeek } from '$features/shifts';
	import { Button } from '$lib/components/ui/button';
	import { TIMESHEET_STATUS_HINTS, wagesBadge } from '../hints';

	let { timesheets }: { timesheets: any[] } = $props();

	// The API returns oldest first; the latest week belongs at the top.
	const sorted = $derived(
		[...timesheets].sort((a, b) =>
			(b.timesheet?.weekBeginDate ?? '').localeCompare(a.timesheet?.weekBeginDate ?? '')
		)
	);
</script>

<svelte:head><title>Timesheets | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Timesheets" description="Enter your hours and track approvals." />

	{#if sorted.length}
		<ul class="space-y-3">
			{#each sorted as row (row.timesheet.id)}
				{@const wages = wagesBadge(row.timesheet)}
				<li class="relative flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card transition duration-fast hover:shadow-lift">
					{#if row.company?.logo}
						<img alt="" src={row.company.logo} class="size-12 shrink-0 rounded-full border bg-white object-contain p-1" />
					{:else}
						<span class="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
							<Building2 class="size-5" aria-hidden="true" />
						</span>
					{/if}
					<div class="min-w-0 flex-1">
						<a
							href={`/timesheets/${row.timesheet.id}`}
							class="block font-bold after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
						>
							{formatWorkWeek(row.timesheet.weekBeginDate) || 'Timesheet'}
						</a>
						<p class="truncate text-sm text-muted-foreground">
							{[row.requisition?.disciplineName, row.company?.name].filter(Boolean).join(' · ')}
						</p>
						<div class="relative z-10 mt-2 flex w-fit flex-wrap gap-2">
							<StatusBadge status={row.timesheet.status} hint={TIMESHEET_STATUS_HINTS[row.timesheet.status]} />
							{#if wages}<StatusBadge status={wages.status} label={wages.label} hint={wages.hint} />{/if}
						</div>
					</div>
					<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			icon={Clipboard}
			title="No timesheets yet"
			description="A timesheet appears here after you work a shift."
		>
			<Button href="/my-shifts?tab=upcoming" variant="outline">View your shifts</Button>
		</EmptyState>
	{/if}
</Page>
