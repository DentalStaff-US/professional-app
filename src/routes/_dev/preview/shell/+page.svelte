<script lang="ts">
	import { page } from '$app/state';
	import Notice from '$dtss/Notice.svelte';
	import AppShell from '$shell/AppShell.svelte';

	// /_dev/preview/shell?path=/settings/documents&banner=1&impersonate=1
	const path = $derived(page.url.searchParams.get('path') ?? '/dashboard');
	const showBanner = $derived(page.url.searchParams.has('banner'));
	const impersonate = $derived(page.url.searchParams.has('impersonate'));
</script>

{#snippet impersonation()}
	<div class="border-b border-status-warning-border bg-status-warning-bg px-4 py-2 text-center text-sm font-semibold text-status-warning-fg">
		Admin view: you're impersonating Maria Lopez.
	</div>
{/snippet}
{#snippet message()}
	<Notice tone="pending" title="Your account is pending approval">
		You'll be able to view and apply to positions once it's approved.
	</Notice>
{/snippet}

<AppShell
	pathname={path}
	name="Maria Lopez"
	email="maria@example.com"
	initials="ML"
	topBanner={impersonate ? impersonation : undefined}
	banner={showBanner ? message : undefined}
>
	<div class="mx-auto w-full max-w-5xl px-4 md:px-6">
		<h1 class="text-h1">Good morning, Maria</h1>
		<p class="mt-2 text-muted-foreground">Path: {path}</p>
		<div class="mt-6 h-[1400px] rounded-lg border bg-card p-6">Tall content to test window scrolling.</div>
	</div>
</AppShell>
