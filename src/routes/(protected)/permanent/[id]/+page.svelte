<script lang="ts">
	import { JobDetailPage } from '$features/shifts';

	let { data } = $props();
</script>

<JobDetailPage
	job={data.requisition}
	application={data.myApplicationStatus}
	reqStatus={data.reqStatus}
	canApply={data.canApply}
	applyForm={data.applyForm}
/>
