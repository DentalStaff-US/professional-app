<script lang="ts">
	import type { PageData } from './$types';
	import '../../app.pcss';
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

<style>
	:root {
		/* Add these styles to your global stylesheet, which is used across all site pages. You only need to do this once. All elements in the library derive their variables and base styles from this central sheet, simplifying site-wide edits. For instance, if you want to modify how your h2's appear across the site, you just update it once in the global styles, and the changes apply everywhere. */
		--primary: #ff6a3e;
		--primaryLight: #ffba43;
		--secondary: #ffba43;
		--secondaryLight: #ffba43;
		--headerColor: #1a1a1a;
		--bodyTextColor: #4e4b66;
		--bodyTextColorWhite: #fafbfc;
		/* 13px - 16px */
		--topperFontSize: clamp(0.8125rem, 1.6vw, 1rem);
		/* 31px - 49px */
		--headerFontSize: clamp(1.9375rem, 3.9vw, 3.0625rem);
		--bodyFontSize: 1rem;
		/* 60px - 100px top and bottom */
		--sectionPadding: clamp(3.75rem, 7.82vw, 6.25rem) 1rem;
	}

	body {
		margin: 0;
		padding: 0;
	}

	*,
	*:before,
	*:after {
		/* prevents padding from affecting height and width */
		box-sizing: border-box;
	}
	.cs-topper {
		font-size: var(--topperFontSize);
		line-height: 1.2em;
		text-transform: uppercase;
		text-align: inherit;
		letter-spacing: 0.1em;
		font-weight: 700;
		color: var(--primary);
		margin-bottom: 0.25rem;
		display: block;
	}

	.cs-title {
		font-size: var(--headerFontSize);
		font-weight: 900;
		line-height: 1.2em;
		text-align: inherit;
		max-width: 43.75rem;
		margin: 0 0 1rem 0;
		color: var(--headerColor);
		position: relative;
	}

	.cs-text {
		font-size: var(--bodyFontSize);
		line-height: 1.5em;
		text-align: inherit;
		width: 100%;
		max-width: 40.625rem;
		margin: 0;
		color: var(--bodyTextColor);
	}
</style>
