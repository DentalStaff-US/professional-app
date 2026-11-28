<script lang="ts">
	import type { Snippet } from 'svelte';
	import Stepper from '$dtss/Stepper.svelte';
	import { ONBOARDING_STEPS } from '../steps';

	let { current, children }: { current: number; children: Snippet } = $props();
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 px-4">
	{#if current >= 0}
		<Stepper steps={ONBOARDING_STEPS.map((step) => step.label)} {current} />
	{/if}
	{@render children()}
</div>
