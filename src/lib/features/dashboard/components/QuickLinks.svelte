<script lang="ts">
	import { Briefcase, Calendar, Clipboard, FileText, Gift, LifeBuoy } from 'lucide-svelte';
	import { affiliateLink, type AffiliateStatus } from '../quickLinks';

	let {
		affiliateStatus,
		onsupport
	}: { affiliateStatus: AffiliateStatus; onsupport: () => void } = $props();

	const affiliate = $derived(affiliateLink(affiliateStatus));
	const links = $derived([
		{ href: '/permanent', label: 'Permanent jobs', icon: Briefcase },
		{ href: '/settings/resume', label: 'Update resume', icon: FileText },
		{ href: '/calendar', label: 'Shift calendar', icon: Calendar },
		{ href: '/timesheets', label: 'Timesheets', icon: Clipboard },
		...(affiliate ? [{ ...affiliate, icon: Gift }] : [])
	]);
	const item =
		'flex min-h-14 w-full items-center gap-3 rounded-lg border bg-card p-3 text-left text-sm font-bold shadow-card transition duration-fast hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<section aria-labelledby="quick-links-heading">
	<h2 id="quick-links-heading" class="mb-3 text-h3">Quick links</h2>
	<ul class="grid grid-cols-2 gap-3 lg:grid-cols-3">
		{#each links as link (link.href)}
			<li>
				<a href={link.href} class={item} data-sveltekit-preload-data={link.href === '/affiliate-portal' ? 'off' : undefined}>
					<link.icon class="size-5 shrink-0 text-primary-dark" aria-hidden="true" />
					{link.label}
				</a>
			</li>
		{/each}
		<li>
			<button type="button" class={item} onclick={onsupport}>
				<LifeBuoy class="size-5 shrink-0 text-primary-dark" aria-hidden="true" />
				Contact support
			</button>
		</li>
	</ul>
</section>
