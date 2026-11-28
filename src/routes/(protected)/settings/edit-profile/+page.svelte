<script lang="ts">
	import { EditProfilePage } from '$features/settings';

	let { data } = $props();
</script>

<EditProfilePage user={data.user} profile={data.profile} form={data.form} avatarForm={data.avatarForm} />
