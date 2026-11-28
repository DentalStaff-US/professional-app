<script lang="ts">
	import { CheckCircle2, ChevronRight, Circle, Clock, Mail, AlertTriangle } from 'lucide-svelte';
	import GhostStack from '$dtss/GhostStack.svelte';
	import Notice from '$dtss/Notice.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { ChecklistItem, ChecklistState } from '../checklist';

	let {
		status,
		submittedAt,
		checklist,
		supportEmail
	}: {
		status?: string | null;
		submittedAt?: string | null;
		checklist: ChecklistItem[] | null;
		supportEmail: string;
	} = $props();

	const STATE: Record<ChecklistState, { icon: any; classes: string; label: string }> = {
		done: { icon: CheckCircle2, classes: 'text-status-positive-fg', label: 'Done' },
		missing: { icon: AlertTriangle, classes: 'text-status-warning-fg', label: 'Needs attention' },
		optional: { icon: Circle, classes: 'text-muted-foreground', label: 'Optional' },
		review: { icon: Clock, classes: 'text-status-pending-fg', label: 'In progress' }
	};

	const FAQ = [
		{
			q: 'How long does approval take?',
			a: 'Usually 2-3 business days. It can take longer depending on the volume of applications and how complete your submission is.'
		},
		{
			q: 'Can I make changes while it\'s under review?',
			a: 'Yes, you can update your profile and documents at any time. Significant changes may restart the review.'
		},
		{
			q: 'What happens after I\'m approved?',
			a: 'We\'ll email you, and you\'ll be able to see open shifts and jobs and start applying right away.'
		}
	];

	const submitted = $derived.by(() => {
		const date = submittedAt ? new Date(submittedAt) : null;
		if (!date || Number.isNaN(date.getTime())) return null;
		return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	});
	const missing = $derived(checklist?.filter((item) => item.state === 'missing').length ?? 0);
	const blocked = $derived(!!status && status !== 'PENDING' && status !== 'ACTIVE');
</script>

<svelte:head><title>Application status | DTSS</title></svelte:head>

{#if status === 'DENIED'}
	<PageHeader title="Your application wasn't approved" />
	<Notice tone="negative">Please contact support if you believe this is a mistake.</Notice>
{:else if blocked}
	<PageHeader title="Your account is inactive" />
	<Notice tone="warning">Contact support to reactivate it.</Notice>
{:else}
	<PageHeader
		title="Your application is under review"
		description={submitted ? `Thanks for completing your profile. You submitted it on ${submitted}.` : 'Thanks for completing your profile.'}
	/>
{/if}

{#if checklist}
	<section aria-labelledby="checklist-heading">
		<h2 id="checklist-heading" class="text-h3">Your application</h2>
		{#if missing && !blocked}
			<p class="mt-1 text-sm text-muted-foreground">Finishing {missing === 1 ? 'the item' : `the ${missing} items`} below can help us approve you sooner.</p>
		{/if}
		<ul class="mt-3 divide-y overflow-hidden rounded-lg border bg-card shadow-card">
			{#each checklist as item (item.id)}
				{@const state = STATE[item.state]}
				{#snippet content()}
					<state.icon class={`size-5 shrink-0 ${state.classes}`} aria-hidden="true" />
					<span class="min-w-0 flex-1">
						<span class="block font-semibold">{item.label}<span class="sr-only"> ({state.label})</span></span>
						<span class="block break-words text-sm text-muted-foreground">{item.detail}</span>
					</span>
				{/snippet}
				<li>
					{#if item.href}
						<a href={item.href} class="flex min-h-16 items-center gap-3 p-4 transition-colors duration-fast hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
							{@render content()}
							<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						</a>
					{:else}
						<div class="flex min-h-16 items-center gap-3 p-4">{@render content()}</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if !blocked}
	<Notice tone="info" title="Add your skills while you wait">
		Skills like CPR help match you to the right work, and they lock once you're approved.
		<a href="/settings/skills" class="mt-1 block min-h-11 py-2 font-bold underline">Add my skills</a>
	</Notice>

	<section class="space-y-4 rounded-lg border bg-card p-5 shadow-card sm:p-6" aria-labelledby="next-heading">
		<GhostStack />
		<div class="text-center">
			<h2 id="next-heading" class="text-h3">What happens next</h2>
			<p class="mt-1 text-muted-foreground">We'll email you when you're approved, or if we need anything else. Your shifts, schedule and pay will show up here.</p>
		</div>
	</section>

	<section aria-labelledby="faq-heading">
		<h2 id="faq-heading" class="text-h3">Common questions</h2>
		<div class="mt-3 divide-y rounded-lg border bg-card shadow-card">
			{#each FAQ as { q, a } (q)}
				<details class="group p-4">
					<summary class="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
						{q}
						<ChevronRight class="size-5 shrink-0 text-muted-foreground transition-transform duration-fast group-open:rotate-90" aria-hidden="true" />
					</summary>
					<p class="mt-2 text-sm text-muted-foreground">{a}</p>
				</details>
			{/each}
		</div>
	</section>
{/if}

<div class="flex flex-wrap gap-3">
	<Button href={`mailto:${supportEmail}`} variant="outline" size="lg" class="flex-1 sm:flex-none">
		<Mail class="mr-2 size-4" aria-hidden="true" /> Contact support
	</Button>
	<Button href="/settings" variant="outline" size="lg" class="flex-1 sm:flex-none">View my profile</Button>
</div>
