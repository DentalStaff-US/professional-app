<script lang="ts">
	// Global CSS is imported once in the root layout (src/routes/+layout.svelte).
	import { page } from '$app/stores';
	import { PUBLIC_CLIENT_APP_DOMAIN } from '$lib/config/appUrls';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';
	import { onMount } from 'svelte';
	import { ModeWatcher, setMode } from 'mode-watcher';
	import { getFlash } from 'sveltekit-flash-message';
	import { toast } from 'svelte-sonner';
	import Notice from '$dtss/Notice.svelte';
	import { authClient } from '$lib/auth-client';
	import { connectInboxSocket } from '$lib/inboxSocket';
	import { Toaster } from '$lib/components/ui/sonner';
	import AppShell from '$shell/AppShell.svelte';

	let { data, children } = $props();

	const user = $derived(data.user);

	// Pages set `data.loadError` from their +page.server.ts load() function when
	// one of their admin-API fetches fails. We surface it here so every protected
	// page gets the same banner without duplicating UI in each route.
	const loadError = $derived(($page.data as { loadError?: string }).loadError);

	// Account-status banner. Only ACTIVE candidates can see/apply to jobs; the
	// status comes from the protected layout load. Server-side enforcement lives
	// in the admin external API — this banner just explains why the app is gated.
	const candidateStatus = $derived(($page.data as { candidateStatus?: string }).candidateStatus);
	const accountBlocked = $derived(!!candidateStatus && candidateStatus !== 'ACTIVE');

	const impersonating = $derived(($page.data as { impersonating?: boolean }).impersonating);

	// Set by the layout load on onboarding routes (incl. awaiting-approval) when
	// a public-job "apply" intent cookie is waiting for them to become eligible.
	const savedJobIntent = $derived(($page.data as { savedJobIntent?: boolean }).savedJobIntent);

	const flash = getFlash(page);
	$effect(() => {
		if (!$flash) return;
		if ($flash.type === 'success') toast.success($flash.message);
		if ($flash.type === 'error') toast.error($flash.message);
	});

	let exitingImpersonation = $state(false);
	async function endImpersonation() {
		exitingImpersonation = true;
		// No admin session exists on this (candidate) domain to restore, so simply
		// end the impersonation session and return to the admin app.
		await authClient.signOut();
		window.location.href = PUBLIC_CLIENT_APP_DOMAIN;
	}
	setMode('light');

	onMount(() => connectInboxSocket());
</script>

<ModeWatcher defaultMode="light" />
<Toaster richColors />
<ProgressBar class="text-primary" zIndex={100} />

{#snippet impersonationBar()}
	<div
		role="alert"
		class="flex flex-wrap items-center justify-center gap-3 border-b border-status-warning-border bg-status-warning-bg px-4 py-2 text-sm font-semibold text-status-warning-fg"
	>
		<span>Admin view: you're impersonating {user?.firstName} {user?.lastName}.</span>
		<button
			class="min-h-9 rounded-md border border-status-warning-border bg-card px-3 font-bold disabled:opacity-50"
			onclick={endImpersonation}
			disabled={exitingImpersonation}
		>
			{exitingImpersonation ? 'Exiting…' : 'End impersonation'}
		</button>
	</div>
{/snippet}

<!-- One message at a time, most urgent first. -->
{#snippet messageBanner()}
	{#if accountBlocked}
		{#if candidateStatus === 'PENDING'}
			<Notice tone="pending" title="Your account is pending approval">
				You'll be able to view and apply to positions once it's approved.
			</Notice>
		{:else if candidateStatus === 'DENIED'}
			<Notice tone="negative" title="Your application was denied">
				Please contact support if you believe this is a mistake.
			</Notice>
		{:else}
			<Notice tone="warning" title="Your account is inactive">
				Viewing and applying to positions is paused. Contact support to reactivate it.
			</Notice>
		{/if}
	{:else if loadError}
		<Notice tone="warning" alert>{loadError}</Notice>
	{:else if savedJobIntent}
		<Notice tone="info">We saved the job you were viewing. Finish your profile to apply.</Notice>
	{/if}
{/snippet}

<AppShell
	pathname={$page.url.pathname}
	name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || (user?.email ?? '')}
	email={user?.email}
	avatarUrl={user?.avatarUrl}
	initials={`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()}
	unreadCount={data.unreadCount ?? 0}
	topBanner={impersonating ? impersonationBar : undefined}
	banner={accountBlocked || loadError || savedJobIntent ? messageBanner : undefined}
>
	{@render children()}
</AppShell>
