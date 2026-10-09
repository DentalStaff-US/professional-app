<!--
  "N shifts hidden by your availability" — the page-level notice on the job lists.

  CANDIDATE APP ONLY. Unlike its siblings in this directory there is no admin twin:
  staff never have shifts hidden from them, they get the per-row warning badge
  instead.

  Modelled on CertLockedBanner, which solved exactly this problem once already: the
  only way a professional learns why shifts disappeared is a page-level notice, and
  it must render even when the list is non-empty.

  One deliberate difference from that banner: variant is DEFAULT, not destructive.
  A lapsed credential is a fault the professional must fix; availability is a choice
  they made on purpose. Painting it red would tell people their own setting is
  broken, which is the opposite of the message.
-->
<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { CalendarOff, Eye, EyeOff } from 'lucide-svelte';

	/** How many otherwise-qualifying shifts the professional's availability removed. */
	export let hiddenCount = 0;
	/** True when ?showUnavailable=1 is in effect, so the list already includes them. */
	export let showingUnavailable = false;
	/**
	 * The route to toggle on, without the query string. A URL param rather than
	 * component state so the state survives a refresh and can be shared with
	 * support.
	 */
	export let basePath: string;
	/** Omitted on pages with no inline editor — then the CTA links to Settings. */
	export let onEdit: (() => void) | null = null;
	export let editDisabled = false;

	$: shifts = hiddenCount === 1 ? 'shift' : 'shifts';
	$: verb = hiddenCount === 1 ? 'is' : 'are';
</script>

{#if hiddenCount > 0 || showingUnavailable}
	<Alert.Root class="mb-4">
		<CalendarOff class="h-4 w-4" />
		<Alert.Title>
			{showingUnavailable
				? `Showing ${hiddenCount} ${shifts} on days you marked off`
				: `${hiddenCount} ${shifts} hidden by your availability`}
		</Alert.Title>
		<Alert.Description class="space-y-3">
			<p>
				{#if showingUnavailable}
					{hiddenCount === 1 ? 'This shift falls' : 'These shifts fall'} on
					{hiddenCount === 1 ? 'a day' : 'days'} you said you can't work. You can still claim
					{hiddenCount === 1 ? 'it' : 'them'} — claiming doesn't change your availability.
				{:else}
					You marked these days as unavailable, so we're keeping {shifts}
					on them out of your board and out of your new-job texts.
				{/if}
			</p>
			<div class="flex flex-wrap gap-2">
				{#if showingUnavailable}
					<Button variant="outline" size="sm" class="gap-2" href={basePath}>
						<EyeOff class="h-4 w-4" /> Hide them again
					</Button>
				{:else}
					<Button variant="outline" size="sm" class="gap-2" href={`${basePath}?showUnavailable=1`}>
						<Eye class="h-4 w-4" /> Show them anyway
					</Button>
				{/if}
				{#if onEdit}
					<Button variant="ghost" size="sm" disabled={editDisabled} on:click={onEdit}>
						Edit availability
					</Button>
				{:else}
					<Button variant="ghost" size="sm" href="/settings/availability">Edit availability</Button>
				{/if}
			</div>
			{#if hiddenCount === 0 && showingUnavailable}
				<p class="text-xs text-muted-foreground">
					Nothing is currently hidden — your availability isn't keeping any shifts off this list.
				</p>
			{/if}
		</Alert.Description>
	</Alert.Root>
{/if}
