<script lang="ts">
	import { enhance } from '$app/forms';
	import { Loader2 } from 'lucide-svelte';
	import Notice from '$dtss/Notice.svelte';
	import Page from '$dtss/Page.svelte';
	import PageHeader from '$dtss/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';

	let { receiveSms, receiveEmail }: { receiveSms: boolean; receiveEmail: boolean } = $props();

	let sms = $state(receiveSms);
	let email = $state(receiveEmail);
	let saving = $state(false);
	let saved = $state<boolean | null>(null);
</script>

<svelte:head><title>Notifications | DTSS</title></svelte:head>

<Page>
	<!-- These only govern manually sent campaigns. Platform messages ignore them. -->
	<PageHeader
		title="Notifications"
		description="Choose how we send you announcements. Messages about your shifts, timesheets and account always go out."
	/>

	<form
		method="POST"
		use:enhance={() => {
			saving = true;
			saved = null;
			return async ({ result, update }) => {
				await update({ reset: false });
				saving = false;
				saved = result.type === 'success';
			};
		}}
		class="space-y-4"
	>
		{#if saved === false}<Notice tone="negative" alert>We couldn't save your preferences. Please try again.</Notice>{/if}
		<ul class="divide-y rounded-lg border bg-card shadow-card">
			<li class="flex items-center justify-between gap-4 p-4">
				<Label for="receive-sms" class="min-w-0">
					<span class="block font-semibold">Text messages</span>
					<span class="block text-sm font-normal text-muted-foreground">Announcements by text. Replying STOP to any text stops all our texts, including shift messages.</span>
				</Label>
				<Switch id="receive-sms" bind:checked={sms} />
			</li>
			<li class="flex items-center justify-between gap-4 p-4">
				<Label for="receive-email" class="min-w-0">
					<span class="block font-semibold">Email</span>
					<span class="block text-sm font-normal text-muted-foreground">Announcements by email.</span>
				</Label>
				<Switch id="receive-email" bind:checked={email} />
			</li>
		</ul>
		{#if sms}<input type="hidden" name="receiveSms" value="on" />{/if}
		{#if email}<input type="hidden" name="receiveEmail" value="on" />{/if}
		<Button type="submit" size="lg" disabled={saving}>
			{#if saving}<Loader2 class="mr-2 size-4 animate-spin" aria-hidden="true" />{/if}
			Save preferences
		</Button>
		<p class="text-sm font-semibold text-primary-dark" role="status">{saved ? 'Preferences saved' : ''}</p>
	</form>
</Page>
