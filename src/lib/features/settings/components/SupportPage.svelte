<script lang="ts">
	import { format } from 'date-fns';
	import { ChevronRight, LifeBuoy, Plus } from 'lucide-svelte';
	import EmptyState from '$dtss/EmptyState.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import NewSupportTicketDialog from '$lib/components/new-support-ticket-dialog.svelte';
	import { Button } from '$lib/components/ui/button';

	let { tickets }: { tickets: any[] } = $props();

	let dialogOpen = $state(false);
</script>

<svelte:head><title>Support | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Support" description="View your tickets or open a new one.">
		{#snippet actions()}
			{#if tickets.length}
				<Button size="lg" class="w-full sm:w-auto" on:click={() => (dialogOpen = true)}>
					<Plus class="mr-2 size-4" aria-hidden="true" /> New ticket
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if tickets.length}
		<ul class="divide-y overflow-hidden rounded-lg border bg-card shadow-card">
			{#each tickets as { supportTicket: ticket } (ticket.id)}
				<li>
					<a href={`/settings/support/${ticket.id}`} class="flex min-h-16 items-center gap-3 p-4 transition-colors duration-fast hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-semibold text-muted-foreground">#{ticket.ticketNumber}</span>
								<StatusBadge status={ticket.status ?? 'NEW'} />
							</div>
							<p class="mt-1 break-words font-semibold">{ticket.title}</p>
							<p class="text-sm text-muted-foreground">Last updated {format(new Date(ticket.updatedAt), 'PPp')}</p>
						</div>
						<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState icon={LifeBuoy} title="No support tickets yet" description="Open a ticket and our team will be in touch.">
			<Button size="lg" on:click={() => (dialogOpen = true)}>
				<Plus class="mr-2 size-4" aria-hidden="true" /> Open a ticket
			</Button>
		</EmptyState>
	{/if}
</Page>

<NewSupportTicketDialog bind:open={dialogOpen} />
