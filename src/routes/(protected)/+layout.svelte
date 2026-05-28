<script lang="ts">
	import type { PageData } from './$types';
	import '../../app.pcss';
	import { page } from '$app/stores';
	import { getFlash } from 'sveltekit-flash-message';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';
	import Navigation from '$lib/components/navigation/navigation.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { AlertTriangle } from 'lucide-svelte';
	export let data: PageData;
	let user: PageData['user'];
	$: user = data.user;

	// Pages set `data.loadError` from their +page.server.ts load() function when
	// one of their admin-API fetches fails. We surface it here so every protected
	// page gets the same banner without duplicating UI in each route.
	$: loadError = ($page.data as { loadError?: string } | undefined)?.loadError;

	// Account-status banner. Only ACTIVE candidates can see/apply to jobs; the
	// status comes from the protected layout load. Server-side enforcement lives
	// in the admin external API — this banner just explains why the app is gated.
	$: candidateStatus = ($page.data as { candidateStatus?: string } | undefined)?.candidateStatus;
	$: accountBlocked = !!candidateStatus && candidateStatus !== 'ACTIVE';

	const flash = getFlash(page);
	$: if ($flash) {
		switch ($flash.type) {
			case 'success':
				toast.success($flash.message);
				break;
			case 'error':
				toast.error($flash.message);
				break;
		}
	}
	import { setMode } from 'mode-watcher';
	setMode('light');
</script>

<ModeWatcher />
<Toaster richColors />
<div class="relative flex h-screen flex-col">
	<Navigation {user} />
	{#if accountBlocked}
		<div
			class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
			role="alert"
		>
			<AlertTriangle class="h-4 w-4 shrink-0" />
			<span>
				{#if candidateStatus === 'PENDING'}
					Your account is <strong>pending approval</strong>. You'll be able to view and apply to
					positions once an admin approves your account.
				{:else if candidateStatus === 'DENIED'}
					Your account application was <strong>denied</strong>. Please contact support if you
					believe this is a mistake.
				{:else}
					Your account is <strong>inactive</strong>. Viewing and applying to positions is paused —
					contact support to reactivate.
				{/if}
			</span>
		</div>
	{/if}
	{#if loadError}
		<div
			class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
			role="alert"
		>
			<AlertTriangle class="h-4 w-4 shrink-0" />
			<span>{loadError}</span>
		</div>
	{/if}
	<div class="py-8 md:py-12 grow flex flex-col h-full overflow-scroll" id="app-main">
		<ProgressBar class="text-blue-500" zIndex={100} />
		<slot />
	</div>
</div>
