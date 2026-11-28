<script lang="ts">
	import { SettingsMenu } from '$features/settings';

	let { data } = $props();

	const user = $derived(data.user);
</script>

<SettingsMenu
	name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || (user?.email ?? '')}
	email={user?.email}
	avatarUrl={user?.avatarUrl}
	initials={`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()}
	affiliate={data.affiliateStatus}
/>
