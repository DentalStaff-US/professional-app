<script lang="ts">
	import TwoFactorSettings from '$lib/components/settings/two-factor-settings.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	$: user = data.user;
</script>

<svelte:head>
	<title>Security | DTSS Professionals</title>
</svelte:head>

<section class="sm:container mx-auto max-w-2xl px-4 pb-12">
	<h1 class="mb-6 text-2xl font-bold md:text-3xl">Security</h1>
	<TwoFactorSettings enabled={Boolean(user?.twoFactorEnabled)} />
</section>
