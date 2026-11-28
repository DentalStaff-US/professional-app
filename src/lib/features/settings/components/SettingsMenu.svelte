<script lang="ts">
	import {
		Bell,
		Briefcase,
		CalendarCheck,
		ChevronRight,
		Clock,
		File,
		FileCheck,
		Gift,
		LifeBuoy,
		LogOut,
		ShieldCheck,
		Sparkles,
		SquareAsterisk,
		UserCog
	} from 'lucide-svelte';
	import Page from '$dtss/Page.svelte';
	import { affiliateLink, type AffiliateStatus } from '$features/dashboard/quickLinks';
	import * as Avatar from '$lib/components/ui/avatar';

	let {
		name,
		email,
		avatarUrl,
		initials,
		affiliate
	}: {
		name: string;
		email?: string | null;
		avatarUrl?: string | null;
		initials: string;
		affiliate?: (NonNullable<AffiliateStatus> & { status?: string; connectComplete?: boolean }) | null;
	} = $props();

	const WORK = [
		{ href: '/timesheets', icon: Clock, label: 'Timesheets', desc: 'Submit your hours and review past timesheets' },
		{ href: '/settings/availability', icon: CalendarCheck, label: 'Availability', desc: 'Days you can work and days off' }
	];
	const PROFILE = [
		{ href: '/settings/edit-profile', icon: UserCog, label: 'Edit profile', desc: 'Personal information and contact details' },
		{ href: '/settings/resume', icon: FileCheck, label: 'Resume', desc: 'Upload and update your resume' },
		{ href: '/settings/experience', icon: Briefcase, label: 'Experience', desc: 'Disciplines and experience levels' },
		{ href: '/settings/skills', icon: Sparkles, label: 'Skills', desc: 'Skills and skill certificates, such as CPR' },
		{ href: '/settings/documents', icon: File, label: 'Documents', desc: 'Licenses, certifications, IDs and other files' }
	];
	const ACCOUNT = [
		{ href: '/settings/notifications', icon: Bell, label: 'Notifications', desc: 'Announcement preferences' },
		{ href: '/auth/password/reset', icon: SquareAsterisk, label: 'Password', desc: 'Change your password' },
		{ href: '/settings/security', icon: ShieldCheck, label: 'Two-factor authentication', desc: 'Add an extra layer of security' },
		{ href: '/settings/support', icon: LifeBuoy, label: 'Support', desc: 'View your tickets and contact our team' }
	];

	// Settings is where someone who isn't enrolled yet starts, so this row always goes
	// on to the portal. Enrollment happens there, and the one-time token signs them in.
	const partner = $derived.by(() => {
		const link = affiliateLink(affiliate);
		if (!link) return null;
		const desc = !affiliate?.enrolled
			? 'Earn commission for practices and professionals you refer'
			: affiliate.status !== 'ACTIVE'
				? 'Your partner account is paused'
				: affiliate.connectComplete
					? 'Your referral link, earnings and payouts'
					: 'Finish setting up payouts to get paid';
		return { href: '/affiliate-portal', icon: Gift, label: link.label, desc };
	});
	const groups = $derived([
		{ title: 'Work', items: partner ? [...WORK, partner] : WORK },
		{ title: 'Profile', items: PROFILE },
		{ title: 'Account', items: ACCOUNT }
	]);
	const row = 'flex min-h-16 w-full items-center gap-4 p-4 text-left transition-colors duration-fast hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
	const iconBox = 'flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary-dark';
</script>

<svelte:head><title>Me | DTSS</title></svelte:head>

<Page>
	<header class="flex items-center gap-4">
		<Avatar.Root class="size-14 shrink-0">
			{#if avatarUrl}<Avatar.Image src={avatarUrl} alt="" />{/if}
			<Avatar.Fallback class="bg-gradient-to-br from-primary to-brand font-bold text-white">{initials}</Avatar.Fallback>
		</Avatar.Root>
		<div class="min-w-0">
			<h1 class="truncate text-h2">{name}</h1>
			{#if email}<p class="truncate text-sm text-muted-foreground">{email}</p>{/if}
		</div>
	</header>

	{#each groups as group (group.title)}
		<section aria-labelledby={`group-${group.title}`}>
			<h2 id={`group-${group.title}`} class="mb-2 text-overline uppercase text-muted-foreground">{group.title}</h2>
			<ul class="divide-y overflow-hidden rounded-lg border bg-card shadow-card">
				{#each group.items as item (item.href)}
					<li>
						<a href={item.href} class={row}>
							<span class={iconBox}><item.icon class="size-5" aria-hidden="true" /></span>
							<span class="min-w-0 flex-1">
								<span class="block font-semibold">{item.label}</span>
								<span class="block text-sm text-muted-foreground">{item.desc}</span>
							</span>
							<ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<form method="POST" action="/auth/sign-out" class="overflow-hidden rounded-lg border bg-card shadow-card">
		<button type="submit" class={row}>
			<span class={iconBox}><LogOut class="size-5" aria-hidden="true" /></span>
			<span class="font-semibold">Sign out</span>
		</button>
	</form>
</Page>
