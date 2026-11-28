<script lang="ts">
	import { cn } from '$lib/utils';
	import { initialsOf } from '../conversation';

	let {
		title,
		avatarUrl,
		isOrganization
	}: { title: string; avatarUrl?: string | null; isOrganization: boolean } = $props();
</script>

<!-- People are round and organizations are square, per the design system. -->
{#if avatarUrl}
	<img
		src={avatarUrl}
		alt=""
		class={cn('size-10 shrink-0 border bg-white object-contain', isOrganization ? 'rounded-lg p-1' : 'rounded-full')}
	/>
{:else}
	<span
		class={cn(
			'flex size-10 shrink-0 items-center justify-center bg-gradient-to-br from-primary to-brand text-sm font-bold text-white',
			isOrganization ? 'rounded-lg' : 'rounded-full'
		)}
		aria-hidden="true"
	>
		{initialsOf(title)}
	</span>
{/if}
