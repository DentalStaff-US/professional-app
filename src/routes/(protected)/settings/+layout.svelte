<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	$: isMenu = $page.url.pathname === '/settings';
</script>

{#if !isMenu}
	<div class="sm:container mx-auto px-4 -mb-4">
		<Button variant="ghost" size="sm" href="/settings" class="gap-1 -ml-2 text-muted-foreground">
			<ArrowLeft class="h-4 w-4" />
			All settings
		</Button>
	</div>
{/if}

<slot />
