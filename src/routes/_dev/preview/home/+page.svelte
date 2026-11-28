<script lang="ts">
	import { page } from '$app/state';
	import { HomePage } from '$features/dashboard';
	import { homeNudges } from '$features/dashboard/nudges';
	import AppShell from '$shell/AppShell.svelte';
	import { requisitions, timesheets, workdays } from '../../fixtures';

	// /_dev/preview/home?state=first-run|empty
	const state = $derived(page.url.searchParams.get('state'));
	const dayInFuture = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
</script>

<AppShell pathname="/dashboard" name="Maria Lopez" email="maria@example.com" initials="ML">
	<HomePage
		firstName="Maria"
		workdays={state ? [] : workdays}
		timesheets={state ? [] : timesheets}
		requisitions={state ? [] : requisitions}
		certLocked={[]}
		hiddenByAvailability={0}
		showUnavailable={false}
		workPreference={undefined}
		claimForm={null}
		nudges={page.url.searchParams.has('nudges') ? homeNudges({ profile: { completeAddress: null, cellPhone: '1' }, disciplines: [{ disciplineId: 'd1', name: 'EFDA', requiresLicense: true, effectiveLicenseExpiry: dayInFuture(20) }] }) : []}
		affiliateStatus={{ programEnabled: true, eligible: true, enrolled: page.url.searchParams.has('enrolled'), status: 'ACTIVE', connectComplete: !page.url.searchParams.has('setup'), referralUrl: 'https://partners.dtstaffingsolutions.com/r/MARIA', ratePercent: '2.50', activity: page.url.searchParams.has('enrolled') ? { clicks: 48, referralsActive: 3, referralsPending: 1, earningsUnpaid: 182.4, earningsPaid: 640 } : null }}
	/>
</AppShell>
