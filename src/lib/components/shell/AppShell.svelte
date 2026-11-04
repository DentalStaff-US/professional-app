<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronLeft } from 'lucide-svelte';
	import logo from '$lib/assets/dtss-logo.png';
	import { activeTab, innerPage, showsTabs, TABS } from '$lib/nav/nav';
	import { cn } from '$lib/utils';
	import UserMenu from './UserMenu.svelte';

	let {
		pathname,
		name,
		email,
		avatarUrl,
		initials,
		topBanner,
		banner,
		children
	}: {
		pathname: string;
		name: string;
		email?: string;
		avatarUrl?: string | null;
		initials: string;
		/** Always shown: admin impersonation. */
		topBanner?: Snippet;
		/** At most one account or page message. */
		banner?: Snippet;
		children: Snippet;
	} = $props();

	const active = $derived(activeTab(pathname));
	const tabs = $derived(showsTabs(pathname));
	const inner = $derived(innerPage(pathname));
</script>

<!-- --tabbar-offset lets fixed action bars inside pages sit above the tabs. -->
<div
	class={cn(
		'flex min-h-dvh flex-col bg-muted/40',
		tabs && '[--tabbar-offset:calc(4rem+env(safe-area-inset-bottom))] md:[--tabbar-offset:0px]'
	)}
>
	{@render topBanner?.()}

	<header class="border-b bg-card">
		<div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
			{#if inner}
				<a
					href={inner.back}
					class="-ml-2 flex h-11 min-w-0 items-center gap-1 rounded-md pr-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
				>
					<ChevronLeft class="size-5 shrink-0" aria-hidden="true" />
					<span class="sr-only">Back to</span>
					<span class="truncate">{inner.title}</span>
				</a>
			{/if}
			<a
				href={tabs ? '/dashboard' : undefined}
				class={cn(
					'shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
					inner && 'hidden md:block'
				)}
			>
				<img src={logo} alt="DTSS" class="h-9 w-auto" />
			</a>

			{#if tabs}
				<nav aria-label="Main" class="hidden h-full flex-1 items-stretch justify-center gap-1 md:flex">
					{#each TABS as tab (tab.href)}
						<a
							href={tab.href}
							aria-current={active === tab.href ? 'page' : undefined}
							class={cn(
								'flex items-center border-b-2 px-3 pt-0.5 text-sm font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
								active === tab.href
									? 'border-primary text-primary-dark'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							)}
						>
							{tab.label}
						</a>
					{/each}
				</nav>
			{/if}

			<UserMenu {name} {email} {avatarUrl} {initials} />
		</div>
	</header>

	{#if banner}
		<div class="mx-auto w-full max-w-5xl px-4 pt-4 md:px-6">{@render banner()}</div>
	{/if}

	<main class={cn('flex w-full flex-1 flex-col py-6 md:py-8', tabs && 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8')}>
		{@render children()}
	</main>

	{#if tabs}
		<nav
			aria-label="Main"
			class="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
		>
			<ul class="flex h-16">
				{#each TABS as tab (tab.href)}
					<li class="flex-1">
						<a
							href={tab.href}
							aria-current={active === tab.href ? 'page' : undefined}
							class={cn(
								'flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
								active === tab.href ? 'text-primary-dark' : 'text-muted-foreground'
							)}
						>
							<tab.icon class={cn('size-6', active === tab.href && 'stroke-[2.5]')} aria-hidden="true" />
							{tab.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</div>
