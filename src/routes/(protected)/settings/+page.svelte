<script lang="ts">
	import {
		Bell,
		Briefcase,
		ChevronRight,
		File,
		FileCheck,
		Gift,
		LifeBuoy,
		ShieldCheck,
		SquareAsterisk,
		UserCog
	} from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Card } from '$lib/components/ui/card';
	import type { PageData } from './$types';
	import convertNameToInitials from '$lib/_helpers/convertNameToInitials';

	export let data: PageData;
	let initials: string = '';

	$: user = data.user;
	$: {
		if (user) {
			initials = convertNameToInitials(user.firstName, user.lastName);
		}
	}

	// Only shown when the program is on AND this account is eligible — a pending,
	// inactive or denied professional never learns the program exists.
	$: affiliate = data.affiliateStatus;
	$: showAffiliate = Boolean(affiliate?.programEnabled && affiliate?.eligible);
	$: affiliateDesc = !affiliate?.enrolled
		? 'Earn commission for practices and professionals you refer'
		: affiliate?.status !== 'ACTIVE'
			? 'Your affiliate account is paused'
			: affiliate?.connectComplete
				? 'Your referral link, earnings and payouts'
				: 'Finish setting up payouts to get paid';

	const items = [
		{ href: '/settings/edit-profile', icon: UserCog, label: 'Edit Profile', desc: 'Personal information, contact, address' },
		{ href: '/settings/resume', icon: FileCheck, label: 'Resume', desc: 'Upload and update your resume' },
		{ href: '/settings/experience', icon: Briefcase, label: 'Experience', desc: 'Disciplines and experience levels' },
		{ href: '/settings/documents', icon: File, label: 'Documents', desc: 'Certifications, IDs, and other files' },
		{ href: '/settings/notifications', icon: Bell, label: 'Notifications', desc: 'Manage SMS & email preferences' },
		{ href: '/auth/password/reset', icon: SquareAsterisk, label: 'Password', desc: 'Change your password' },
		{ href: '/settings/security', icon: ShieldCheck, label: 'Two-Factor Authentication', desc: 'Add an extra layer of security at sign in' },
		{ href: '/settings/support', icon: LifeBuoy, label: 'Support', desc: 'View your tickets and contact our team' }
	];

	// Routed through /affiliate-portal rather than straight at the portal URL, so
	// the one-time-token handoff signs the user in on arrival.
	$: allItems = showAffiliate
		? [
				...items,
				{
					href: '/affiliate-portal',
					icon: Gift,
					label: 'Affiliate Program',
					desc: affiliateDesc
				}
			]
		: items;
</script>

<svelte:head>
	<title>My Settings | DTSS</title>
</svelte:head>

<section class="sm:container max-w-3xl mx-auto px-4 pb-12">
	<div class="mb-8 flex gap-4 items-center">
		<Avatar.Root class="h-14 w-14 md:h-20 md:w-20 shrink-0">
			<Avatar.Image src={user?.avatarUrl} />
			<Avatar.Fallback>{initials}</Avatar.Fallback>
		</Avatar.Root>
		<div class="min-w-0">
			<p class="text-xl md:text-3xl font-bold">{user?.firstName} {user?.lastName}</p>
			<p class="text-sm text-muted-foreground truncate">{user?.email}</p>
		</div>
	</div>

	<Card class="divide-y">
		{#each allItems as item}
			<a href={item.href} class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
				<div
					class="flex items-center justify-center h-10 w-10 rounded-md bg-muted text-blue-800 shrink-0"
				>
					<svelte:component this={item.icon} class="h-5 w-5" />
				</div>
				<div class="flex-1 min-w-0">
					<p class="font-medium">{item.label}</p>
					<p class="text-sm text-muted-foreground">{item.desc}</p>
				</div>
				<ChevronRight class="text-muted-foreground shrink-0 h-5 w-5" />
			</a>
		{/each}
	</Card>
</section>
