<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { enhance } from '$app/forms';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { StatusBadge } from '$lib/components/ui/status-badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Loader2 } from 'lucide-svelte';

	export let data: PageData;

	$: ticket = data.ticket;
	$: comments = ticket?.comments ?? [];
	$: ticketStatus = ticket?.details.ticket.status ?? 'NEW';
	$: isClosed = ticketStatus === 'CLOSED';

	let newComment = '';
	let postingComment = false;
	let closingTicket = false;

	function initials(first?: string | null, last?: string | null) {
		return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
	}
</script>

<svelte:head>
	<title>Support Ticket | DTSS</title>
</svelte:head>

{#if !ticket}
	<section class="sm:container max-w-3xl mx-auto px-4 py-6 pb-12">
		<p class="text-sm text-muted-foreground">
			{data.loadError ?? 'Ticket not available.'}
		</p>
	</section>
{:else}
	<section class="sm:container max-w-3xl mx-auto px-4 py-6 pb-12 space-y-6">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<div class="flex items-center gap-2 flex-wrap">
					<h1 class="text-2xl md:text-3xl font-bold leading-tight">
						{ticket.details.ticket.title}
					</h1>
					<StatusBadge status={ticketStatus} />
				</div>
				<p class="text-xs text-muted-foreground mt-1">
					Ticket #{ticket.details.ticket.id.slice(0, 8)} · Submitted {format(
						new Date(ticket.details.ticket.createdAt),
						'PPp'
					)}
				</p>
			</div>

			{#if !isClosed}
				<form
					method="POST"
					action="?/closeTicket"
					use:enhance={() => {
						closingTicket = true;
						return async ({ update }) => {
							await update();
							closingTicket = false;
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={closingTicket}>
						{#if closingTicket}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Close Ticket
					</Button>
				</form>
			{/if}
		</div>

		<Card>
			<CardHeader>
				<CardTitle>Reported Issue</CardTitle>
				<CardDescription>Details you provided when opening this ticket.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-1">
						<h3 class="font-semibold text-sm">Expected</h3>
						<div class="bg-muted p-3 rounded-md text-sm whitespace-pre-line">
							{ticket.details.ticket.expectedResult || 'Not provided'}
						</div>
					</div>
					<div class="space-y-1">
						<h3 class="font-semibold text-sm">Actual</h3>
						<div class="bg-muted p-3 rounded-md text-sm whitespace-pre-line">
							{ticket.details.ticket.actualResults || 'Not provided'}
						</div>
					</div>
				</div>
				<div class="space-y-1">
					<h3 class="font-semibold text-sm">Steps to Reproduce</h3>
					<div class="bg-muted p-3 rounded-md text-sm whitespace-pre-line">
						{ticket.details.ticket.stepsToReproduce || 'Not provided'}
					</div>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Conversation ({comments.length})</CardTitle>
				<CardDescription>Replies from our support team will appear here.</CardDescription>
			</CardHeader>
			<CardContent>
				{#if comments.length === 0}
					<p class="text-sm text-muted-foreground text-center py-6">No replies yet.</p>
				{:else}
					<div class="space-y-5">
						{#each comments as c (c.comment.id)}
							<div class="flex gap-3">
								<Avatar.Root class="h-9 w-9 shrink-0">
									<Avatar.Image src={c.user?.avatarUrl ?? undefined} />
									<Avatar.Fallback>{initials(c.user?.firstName, c.user?.lastName)}</Avatar.Fallback>
								</Avatar.Root>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-medium text-sm">
											{c.user?.firstName ?? ''} {c.user?.lastName ?? ''}
										</span>
										{#if c.user?.role}
											<Badge variant="outline" class="text-xs">
												{c.user.role.replace('_', ' ')}
											</Badge>
										{/if}
										<span class="text-xs text-muted-foreground ml-auto">
											{format(new Date(c.comment.createdAt), 'PPp')}
										</span>
									</div>
									<div class="mt-1 rounded-md bg-muted p-3 text-sm whitespace-pre-line">
										{c.comment.body}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
			{#if !isClosed}
				<CardFooter>
					<form
						method="POST"
						action="?/addComment"
						class="w-full space-y-2"
						use:enhance={() => {
							postingComment = true;
							return async ({ update }) => {
								await update({ reset: false });
								newComment = '';
								postingComment = false;
							};
						}}
					>
						<Textarea
							name="body"
							bind:value={newComment}
							placeholder="Add a reply..."
							class="min-h-24"
							required
						/>
						<div class="flex justify-end">
							<Button
								type="submit"
								class="bg-blue-800 hover:bg-blue-900"
								disabled={postingComment || newComment.trim().length === 0}
							>
								{#if postingComment}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Posting...
								{:else}
									Post Reply
								{/if}
							</Button>
						</div>
					</form>
				</CardFooter>
			{/if}
		</Card>
	</section>
{/if}
