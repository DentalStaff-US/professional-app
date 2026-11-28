<script lang="ts">
	import { cn } from '$lib/utils';

	type Tab = 'available' | 'upcoming' | 'past' | 'permanent';
	let { active }: { active: Tab } = $props();

	const TABS: { id: Tab; label: string; href: string }[] = [
		{ id: 'available', label: 'Available', href: '/my-shifts' },
		{ id: 'upcoming', label: 'Upcoming', href: '/my-shifts?tab=upcoming' },
		{ id: 'past', label: 'Past', href: '/my-shifts?tab=past' },
		{ id: 'permanent', label: 'Permanent', href: '/permanent' }
	];
</script>

<nav aria-label="Shifts" class="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 sm:w-fit sm:min-w-[28rem]">
	{#each TABS as tab (tab.id)}
		<a
			href={tab.href}
			data-sveltekit-noscroll
			aria-current={active === tab.id ? 'page' : undefined}
			class={cn(
				'flex h-11 items-center justify-center rounded-md px-1 text-xs font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm',
				active === tab.id ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
			)}
		>
			{tab.label}
		</a>
	{/each}
</nav>
