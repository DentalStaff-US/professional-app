<script lang="ts">
	import { NotificationsPage } from '$features/settings';

	let { data } = $props();
</script>

<NotificationsPage receiveSms={data.receiveSms} receiveEmail={data.receiveEmail} />
