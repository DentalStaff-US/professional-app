<script lang="ts">
	import { page } from '$app/state';
	import { CalendarPage } from '$features/shifts';
	import AppShell from '$shell/AppShell.svelte';
	import { calendarDays, todayDate } from '../../fixtures';

	const empty = $derived(page.url.searchParams.has('empty'));
	const req = $derived(Number(page.url.searchParams.get('req')) || null);
	const form = { data: { availableDays: [1, 2, 3, 4, 5], blockedDates: [], replaceFrom: todayDate, replaceTo: todayDate } };
</script>

<AppShell pathname="/calendar" name="Maria Lopez" email="maria@example.com" initials="ML">
	<CalendarPage
		recurrenceDays={empty ? [] : calendarDays}
		today={todayDate}
		focusReqId={req}
		claimForm={null}
		availabilityForm={form}
		availabilityLoaded={true}
	/>
</AppShell>
