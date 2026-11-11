<script lang="ts">
	import { page } from '$app/state';
	import { TimesheetPage, TimesheetsPage } from '$features/timesheets';
	import AppShell from '$shell/AppShell.svelte';
	import { sheetCompany, sheetDays, sheetRequisition, sheetRows, sheetSaved } from '../../fixtures';

	// /_dev/preview/timesheet?status=DRAFT|PENDING|DISCREPANCY|APPROVED or ?list=1 or ?list=empty
	// &thread=none for no conversation yet (start one), &blocked=1 to hide the button
	const list = $derived(page.url.searchParams.get('list'));
	const status = $derived(page.url.searchParams.get('status') ?? 'DRAFT');
	const sheet = $derived({
		id: 't1',
		status,
		weekBeginDate: sheetDays[0].recurrenceDay.date,
		hoursRaw: status === 'DRAFT' ? [] : sheetSaved,
		discrepancyNote: status === 'DISCREPANCY' ? 'Tuesday hours are longer than the scheduled shift.' : null
	});
</script>

<AppShell pathname={list ? '/timesheets' : '/timesheets/t1'} name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if list}
		<TimesheetsPage timesheets={list === 'empty' ? [] : sheetRows} />
	{:else}
		{#key status}
			<TimesheetPage
				timesheet={sheet}
				requisition={sheetRequisition}
				company={sheetCompany}
				conversationId={page.url.searchParams.get('thread') === 'none' ? null : 'preview-conversation'}
				canMessagePractice={page.url.searchParams.get('blocked') !== '1'}
				workdays={sheetDays}
				expenses={[{ id: 'e1', description: 'Parking', amountCents: 1250, status: 'PENDING', rejectionReason: null }, { id: 'e2', description: 'Supplies', amountCents: 800, status: 'REJECTED', rejectionReason: 'Provided by the practice' }]}
				addExpenseForm={null}
			/>
		{/key}
	{/if}
</AppShell>
