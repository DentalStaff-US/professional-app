<script lang="ts">
	// Global stylesheet (Tailwind + the :root design tokens like --primary) lives
	// in the ROOT layout so it loads on every page as part of the always-present
	// root bundle. Importing it only in the (public)/(protected) group layouts
	// made it a route-level CSS chunk that, if it failed to preload, dropped the
	// :root variables → unstyled/white buttons (bg-primary → hsl(var(--primary))).
	import '../app.pcss';
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';
	import { updated } from '$app/stores';
	import { beforeNavigate } from '$app/navigation';
	import type { LayoutData } from './$types';

	export let data: LayoutData;
	$: user = data.user;

	$: if (browser && user) {
		posthog.identify(user.id, { role: user.role });
	} else if (browser && !user) {
		posthog.reset();
	}

	// If a newer deploy has shipped while this tab was open, do a full-page load on
	// the next navigation instead of a client-side one. The fresh HTML references
	// the current immutable asset hashes, so we never try to preload a CSS/JS chunk
	// from the previous build that this container no longer serves.
	beforeNavigate((nav) => {
		if ($updated && nav.to?.url && !nav.willUnload) {
			nav.cancel();
			window.location.href = nav.to.url.href;
		}
	});
</script>

<slot />
