<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { cn } from '$lib/utils';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { goto } from '$app/navigation';

	export let data;

	$: timesheets = data.timesheets;

	// Render the work-week range from a YYYY-MM-DD weekBeginDate using the
	// admin app's pattern: start + 6 days, formatted in UTC so the displayed
	// dates match the stored values regardless of viewer timezone/locale.
	// See dental-staff-app/src/routes/(protected)/timesheets/+page.svelte
	function formatWorkWeek(weekBeginDate: string | null | undefined): string {
		if (!weekBeginDate) return '-';
		const start = new Date(weekBeginDate);
		if (isNaN(start.getTime())) return '-';
		const end = new Date(start);
		end.setUTCDate(start.getUTCDate() + 6);
		const fmt = (d: Date) =>
			d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
		return `${fmt(start)} – ${fmt(end)}, ${start.getUTCFullYear()}`;
	}
</script>

<svelte:head>
	<title>Timesheets | DentalStaff.US</title>
</svelte:head>

<section class="container flex flex-col gap-6 pb-16 max-w-4xl px-4">
	<div class="flex items-center justify-between flex-wrap gap-8">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">Timesheets</h1>
		<!-- <Button
			href="/timesheets/new"
			class="bg-blue-800 hover:bg-blue-900 w-full md:w-fit flex-grow md:grow-0"
			><PlusIcon size={24} class="mr-2" />New Timesheet</Button
		> -->
	</div>
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Company/Shift Details</Table.Head>
				<Table.Head>Work Week</Table.Head>
				<Table.Head>Status</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each timesheets as data, i (i)}
				<Table.Row class="cursor-pointer" on:click={() => goto(`/timesheets/${data.timesheet.id}`)}>
					<Table.Cell class="font-medium">
						<div class="flex flex-row gap-2 items-center">
							<img alt="company logo" class="md:w-12 h-8 w-8 md:h-12" src={data.company.logo} />
							<div>
								<p class="">{data.requisition.disciplineName}</p>
								<p class="text-xs text-gray-700">{data.company.name}</p>
							</div>
						</div>
					</Table.Cell>
					<Table.Cell>{formatWorkWeek(data.timesheet.weekBeginDate)}</Table.Cell>
					<Table.Cell>
						<Badge
							class={cn(
								data?.timesheet?.status === 'PENDING' && 'bg-yellow-300 hover:bg-yellow-400',
								data?.timesheet?.status === 'DISCREPANCY' && 'bg-orange-400 hover:bg-orange-500',
								data?.timesheet?.status === 'APPROVED' && 'bg-green-400 hover:bg-green-600',
								data?.timesheet?.status === 'VOID' && 'bg-gray-200 hover:bg-gray-300',
								data?.timesheet?.status === 'REJECTED' && 'bg-red-500 hover:bg-red-600'
							)}
							variant="default">{data.timesheet.status}</Badge
						>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</section>
