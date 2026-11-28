<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	let { children } = $props();

	const isMenu = $derived(page.url.pathname === '/settings');
</script>

<!-- On phones the top bar already has a back link. -->
{#if !isMenu}
	<div class="mx-auto hidden w-full max-w-5xl px-6 pb-2 md:block">
		<Button variant="ghost" size="sm" href="/settings" class="-ml-2 gap-1 text-muted-foreground">
			<ArrowLeft class="size-4" aria-hidden="true" /> All settings
		</Button>
	</div>
{/if}

{@render children()}
