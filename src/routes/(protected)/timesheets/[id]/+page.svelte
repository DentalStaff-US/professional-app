<script lang="ts">
	import { TimesheetPage } from '$features/timesheets';

	let { data } = $props();
</script>

{#key data.timesheet?.id}
	<TimesheetPage
		timesheet={data.timesheet}
		requisition={data.requisition}
		company={data.company}
		conversationId={data.conversationId}
		canMessagePractice={data.canMessagePractice}
		workdays={data.workdays ?? []}
		expenses={data.expenses ?? []}
		addExpenseForm={data.addExpenseForm}
	/>
{/key}
