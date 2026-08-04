<script lang="ts">
	import { Lock, MapPin } from 'lucide-svelte';

	/**
	 * Stand-in for a practice's identity on a shift the candidate doesn't hold.
	 * The name, address and contact details aren't hidden with CSS — they never
	 * leave the server (see `$lib/server/privacy/clientIdentity` in the admin
	 * app), so there's nothing in the payload to un-hide from devtools.
	 *
	 * `city` / `state` / `distanceMiles` are the coarse location the API does
	 * return, so the candidate can still judge the commute.
	 */
	export let city: string | null = null;
	export let state: string | null = null;
	export let distanceMiles: number | null = null;
	/** Copy for what unlocks it — differs for temp shifts vs permanent roles. */
	export let unlockMessage = 'Claim this shift to see the practice name and address.';
	/** `compact` drops the explanatory line for dense list rows. */
	export let compact = false;

	$: area = [city, state].filter(Boolean).join(', ');
	$: distanceLabel = distanceMiles != null ? `~${distanceMiles} mi away` : null;
	$: locationLine = [area, distanceLabel].filter(Boolean).join(' · ');
</script>

<div
	class="rounded-md border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2 {compact
		? 'space-y-0.5'
		: 'space-y-1'}"
>
	<div class="flex items-center gap-1.5 text-slate-700">
		<Lock class="h-3.5 w-3.5 shrink-0" />
		<span class="text-sm font-medium">Practice details hidden</span>
	</div>

	{#if locationLine}
		<div class="flex items-center gap-1.5 text-sm text-slate-600">
			<MapPin class="h-3.5 w-3.5 shrink-0" />
			<span>{locationLine}</span>
		</div>
	{/if}

	{#if !compact}
		<p class="text-xs text-slate-500">{unlockMessage}</p>
	{/if}
</div>
