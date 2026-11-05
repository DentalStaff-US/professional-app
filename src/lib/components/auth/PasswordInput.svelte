<script lang="ts">
	import { getFormField } from 'formsnap';
	import { Eye, EyeOff } from 'lucide-svelte';
	import * as Form from '$lib/components/ui/form';
	import { passwordStrength } from './signUpContext';

	// Lives inside a Form.Item, and reads the field from it.
	let { autocomplete, strength = false }: { autocomplete: string; strength?: boolean } = $props();

	const { value } = getFormField();

	let show = $state(false);
	const hint = $derived(strength ? passwordStrength(String($value ?? '')) : null);
</script>

<div class="relative">
	<Form.Input type={show ? 'text' : 'password'} {autocomplete} class="h-11 pr-12" />
	<button
		type="button"
		class="absolute right-0 top-0 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		aria-label={show ? 'Hide password' : 'Show password'}
		aria-pressed={show}
		onclick={() => (show = !show)}
	>
		{#if show}<EyeOff class="size-5" aria-hidden="true" />{:else}<Eye class="size-5" aria-hidden="true" />{/if}
	</button>
</div>
{#if hint}<p class="text-sm text-muted-foreground" aria-live="polite">{hint}</p>{/if}
