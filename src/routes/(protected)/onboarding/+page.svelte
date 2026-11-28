<script lang="ts">
	import { ProfileStep } from '$features/onboarding';

	let { data } = $props();
</script>

<ProfileStep user={data.user} form={data.form} avatarForm={data.avatarForm} />
