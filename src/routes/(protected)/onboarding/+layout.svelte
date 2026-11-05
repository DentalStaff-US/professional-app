<script lang="ts">
	import { page } from '$app/state';
	import { currentStepIndex, OnboardingFrame } from '$features/onboarding';

	let { children } = $props();
</script>

<OnboardingFrame current={currentStepIndex(page.url.pathname)}>
	{@render children()}
</OnboardingFrame>
