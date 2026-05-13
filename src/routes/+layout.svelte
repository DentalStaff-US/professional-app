<script lang="ts">
	import posthog from 'posthog-js';
	import { browser } from '$app/environment';
	import type { LayoutData } from './$types';

	export let data: LayoutData;
	$: user = data.user;

	$: if (browser && user) {
		posthog.identify(user.id, { role: user.role });
	} else if (browser && !user) {
		posthog.reset();
	}
</script>

<slot />
