<script lang="ts">
	import type { PageData } from './$types';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { StatusBadge } from '$lib/components/ui/status-badge';
	import { ChevronRight, LifeBuoy, Plus } from 'lucide-svelte';
	import { format } from 'date-fns';
	import NewSupportTicketDialog from '$lib/components/new-support-ticket-dialog.svelte';

	export let data: PageData;

	$: tickets = data.tickets ?? [];

	let dialogOpen = false;
</script>

<svelte:head>
	<title>Support | DTSS</title>
</svelte:head>

<section class="sm:container max-w-3xl mx-auto px-4 py-6 pb-12">
	<div class="mb-6 flex items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl md:text-3xl font-bold leading-tight">Support</h1>
			<p class="text-sm text-muted-foreground">View your tickets or open a new one.</p>
		</div>
		<Button on:click={() => (dialogOpen = true)} class="bg-primary hover:bg-primary/90 shrink-0">
			<Plus class="h-4 w-4 mr-1.5" />
			New Ticket
		</Button>
	</div>

	{#if data.loadError}
		<div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
			{data.loadError}
		</div>
	{/if}

	{#if tickets.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center text-center py-12 gap-3">
				<div class="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
					<LifeBuoy class="h-6 w-6 text-blue-700" />
				</div>
				<div>
					<p class="font-medium">No support tickets yet</p>
					<p class="text-sm text-muted-foreground">
						Open a ticket and our team will be in touch.
					</p>
				</div>
				<Button variant="outline" on:click={() => (dialogOpen = true)} class="mt-2">
					<Plus class="h-4 w-4 mr-1.5" />
					Open a Ticket
				</Button>
			</CardContent>
		</Card>
	{:else}
		<Card class="divide-y">
			{#each tickets as ticket (ticket.supportTicket.id)}
				<a
					href={`/settings/support/${ticket.supportTicket.id}`}
					class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
				>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="text-xs font-semibold text-muted-foreground"
								>#{ticket.supportTicket.ticketNumber}</span
							>
							<p class="font-medium truncate">{ticket.supportTicket.title}</p>
							<StatusBadge status={ticket.supportTicket.status ?? 'NEW'} />
						</div>
						<p class="text-xs text-muted-foreground mt-1">
							Last updated {format(new Date(ticket.supportTicket.updatedAt), 'PPp')}
						</p>
					</div>
					<ChevronRight class="text-muted-foreground shrink-0 h-5 w-5" />
				</a>
			{/each}
		</Card>
	{/if}
</section>

<NewSupportTicketDialog bind:open={dialogOpen} />
