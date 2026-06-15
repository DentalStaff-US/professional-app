<script lang="ts">
	import type { PageData } from './$types';
	// Global CSS is imported once in the root layout (src/routes/+layout.svelte).
	import { page } from '$app/stores';
	// import { ModeWatcher } from 'mode-watcher';
	import { getFlash } from 'sveltekit-flash-message';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';
	import Navigation from '$lib/components/navigation/navigation.svelte';

	export let data: PageData;
	let user: PageData['user'];
	$: user = data.user;
	const flash = getFlash(page);
	//$: console.log('+layout.svelte root flash: ' + JSON.stringify($flash));
	$: if ($flash) {
		switch ($flash.type) {
			case 'success':
				//console.log('flash.message.success: ' + $flash.message);
				toast.success($flash.message);
				break;
			case 'error':
				//console.log('flash.message.error: ' + $flash.message);
				toast.error($flash.message);
				break;
		}
	}
</script>

<!-- <ModeWatcher /> -->
<Toaster richColors />
<div class="relative flex min-h-screen flex-col">
	<!-- <Navigation {user} /> -->
	<div id="app-main">
		<!-- <ProgressBar class="text-blue-500" zIndex={100} /> -->
		<slot />
	</div>
</div>

<!--
	Removed leftover CodeStitch landing-template boilerplate that defined a global
	`:root { --primary: #ff6a3e; ... }`. Because Svelte can't scope `:root`, it leaked
	app-wide and overrode shadcn's HSL `--primary`, making `bg-primary`/`text-primary`
	resolve to `hsl(#ff6a3e)` (invalid) → broken/white styles on public pages. The
	`.cs-*` classes and these vars were unused anywhere in the app; the body/box-sizing
	resets are already covered by Tailwind's preflight.
-->

