<script lang="ts">
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import TwoFactorSettings from '$lib/components/settings/two-factor-settings.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Two-factor authentication | DTSS</title></svelte:head>

<Page>
	<PageHeader title="Two-factor authentication" description="Add an extra layer of security to your account." />
	<div class="max-w-2xl">
		<TwoFactorSettings enabled={Boolean(data.user?.twoFactorEnabled)} />
	</div>
</Page>
