<script lang="ts">
	import { onMount } from 'svelte';
	import { Download, X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { isIos, shouldOfferInstall } from '../install';

	let { hasClaimed }: { hasClaimed: boolean } = $props();

	const VISITS = 'dtss_install_visits';
	const DISMISSED = 'dtss_install_dismissed';
	const COUNTED = 'dtss_install_counted';

	let offer = $state(false);
	let ios = $state(false);
	let installEvent = $state<any>(null);

	// A convenience only, so blocked storage just means no prompt.
	function read(storage: Storage, key: string) {
		try {
			return storage.getItem(key);
		} catch {
			return null;
		}
	}
	function write(storage: Storage, key: string, value: string) {
		try {
			storage.setItem(key, value);
		} catch {
			// See read().
		}
	}

	onMount(() => {
		let visits = Number(read(localStorage, VISITS) ?? 0);
		if (!read(sessionStorage, COUNTED)) {
			visits += 1;
			write(localStorage, VISITS, String(visits));
			write(sessionStorage, COUNTED, '1');
		}
		const allowed = shouldOfferInstall({
			visits,
			hasClaimed,
			dismissed: read(localStorage, DISMISSED) === '1',
			installed: window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
		});
		if (!allowed) return;

		ios = isIos(navigator.userAgent);
		offer = ios;
		const onInstallable = (event: Event) => {
			event.preventDefault();
			installEvent = event;
			offer = true;
		};
		window.addEventListener('beforeinstallprompt', onInstallable);
		return () => window.removeEventListener('beforeinstallprompt', onInstallable);
	});

	function dismiss() {
		offer = false;
		write(localStorage, DISMISSED, '1');
	}

	async function install() {
		await installEvent?.prompt();
		dismiss();
	}
</script>

{#if offer}
	<section class="relative flex items-start gap-3 rounded-lg border bg-card p-4 pr-12 shadow-card md:hidden" aria-labelledby="install-heading">
		<Download class="mt-0.5 size-5 shrink-0 text-primary-dark" aria-hidden="true" />
		<div>
			<h2 id="install-heading" class="font-bold">Add DTSS to your home screen</h2>
			{#if ios}
				<p class="mt-0.5 text-sm text-muted-foreground">Tap the Share button in Safari, then Add to Home Screen.</p>
			{:else}
				<p class="mt-0.5 text-sm text-muted-foreground">Open your shifts in one tap, like an app.</p>
				<Button class="mt-3 min-h-11" on:click={install}>Add to home screen</Button>
			{/if}
		</div>
		<Button variant="ghost" size="icon" class="absolute right-0 top-0 size-11 text-muted-foreground" aria-label="Dismiss" on:click={dismiss}>
			<X class="size-4" aria-hidden="true" />
		</Button>
	</section>
{/if}
