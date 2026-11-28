<script lang="ts">
	// The professional's own referral activity. Detail, payouts and setup live in
	// the partner portal; /affiliate-portal signs them in on the way.
	import { Check, Copy, ExternalLink } from 'lucide-svelte';
	import StatusBadge from '$dtss/StatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import { affiliateCardState, money, type AffiliateOverview } from '../affiliateCard';

	let { overview }: { overview: AffiliateOverview | null | undefined } = $props();

	const card = $derived(affiliateCardState(overview));
	const activity = $derived(overview?.activity);
	const stats = $derived(
		activity
			? [
					{ label: 'Active referrals', value: String(activity.referralsActive), detail: activity.referralsPending ? `${activity.referralsPending} under review` : '' },
					{ label: 'Link clicks', value: String(activity.clicks), detail: '' },
					{ label: 'Earned, not paid yet', value: money(activity.earningsUnpaid), detail: '' },
					{ label: 'Paid to you', value: money(activity.earningsPaid), detail: '' }
				]
			: []
	);
	let copied = $state(false);

	async function copy() {
		if (!overview?.referralUrl) return;
		try {
			await navigator.clipboard.writeText(overview.referralUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

{#snippet portal(label: string, variant: 'default' | 'outline')}
	<Button href="/affiliate-portal" {variant} class="min-h-11" data-sveltekit-preload-data="off">
		{label}<ExternalLink class="ml-2 size-4" aria-hidden="true" />
	</Button>
{/snippet}

{#if card.kind !== 'hidden'}
	<section aria-labelledby="affiliate-heading">
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 id="affiliate-heading" class="text-h3">Referral rewards</h2>
			{#if card.kind === 'active' || card.kind === 'paused'}<StatusBadge status={card.badge.status} label={card.badge.label} />{/if}
		</div>
		<div class="rounded-xl border bg-card p-5 shadow-card">
			{#if card.kind === 'join'}
				<p class="text-muted-foreground">
					Know a practice or professional we should meet? Refer them{overview?.ratePercent ? ` and earn ${Number(overview.ratePercent)}% of the regular hours on their paid temp shifts` : ' and earn commission on their temp shifts'}.
				</p>
				<div class="mt-4">{@render portal('Join the program', 'default')}</div>
			{:else}
				{#if card.kind === 'paused'}<p class="mb-4 text-sm text-muted-foreground">{card.message}</p>{/if}
				{#if stats.length}
					<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
						{#each stats as stat (stat.label)}
							<div class="flex flex-col-reverse justify-end">
								<dt class="text-sm text-muted-foreground">{stat.label}{#if stat.detail}<span class="block text-xs">{stat.detail}</span>{/if}</dt>
								<dd class="text-xl font-extrabold tabular-nums">{stat.value}</dd>
							</div>
						{/each}
					</dl>
				{/if}
				{#if card.kind === 'active' && card.setupNeeded}
					<p class="mt-4 text-sm font-semibold text-status-warning-fg">Finish setting up payouts so we can pay your commission.</p>
				{/if}
				<div class="mt-4 flex flex-wrap gap-2">
					{#if card.kind === 'active' && overview?.referralUrl}
						<Button variant="outline" class="min-h-11" on:click={copy}>
							{#if copied}<Check class="mr-2 size-4" aria-hidden="true" />Copied{:else}<Copy class="mr-2 size-4" aria-hidden="true" />Copy your link{/if}
						</Button>
					{/if}
					{@render portal(card.kind === 'active' && card.setupNeeded ? 'Finish setup' : 'Open the portal', 'outline')}
				</div>
			{/if}
		</div>
	</section>
{/if}
