<script lang="ts">
	import { PUBLIC_SUPPORT_EMAIL } from '$env/static/public';
	import { AwaitingApprovalPage } from '$features/onboarding';

	let { data } = $props();
</script>

<AwaitingApprovalPage status={data.profile?.status} submittedAt={data.profile?.createdAt} checklist={data.checklist} supportEmail={PUBLIC_SUPPORT_EMAIL} />
