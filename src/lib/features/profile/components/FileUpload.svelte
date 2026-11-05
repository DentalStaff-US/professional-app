<script lang="ts">
	import { Camera, Loader2, Upload } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { matchesAccept } from '../upload';

	let {
		label,
		hint,
		accept,
		maxSizeMB = 10,
		multiple = false,
		camera = false,
		onfiles
	}: {
		label: string;
		hint: string;
		accept: string[];
		maxSizeMB?: number;
		multiple?: boolean;
		camera?: boolean;
		/** Resolves once handled. A thrown Error's message is shown here. */
		onfiles: (files: File[]) => Promise<void>;
	} = $props();

	let busy = $state(false);
	let error = $state('');
	let dragging = $state(false);

	// Photos are downscaled before upload, so their starting size doesn't decide this.
	const tooBig = (file: File) =>
		file.size > (file.type.startsWith('image/') ? Math.max(maxSizeMB, 30) : maxSizeMB) * 1024 * 1024;

	async function take(list: FileList | null | undefined) {
		const files = Array.from(list ?? []);
		if (!files.length || busy) return;
		error = '';
		const refused = files.find((file) => !matchesAccept(file, accept));
		const large = files.find(tooBig);
		if (refused) error = `We can't accept ${refused.name}. ${hint}`;
		else if (large) error = `${large.name} is too large. The limit is ${maxSizeMB}MB.`;
		if (error) return;
		busy = true;
		try {
			await onfiles(multiple ? files : files.slice(0, 1));
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'That upload failed. Please try again.';
		} finally {
			busy = false;
		}
	}

	function picked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		take(input.files).finally(() => (input.value = ''));
	}

	const pickerClass = 'cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2';
</script>

<div>
	<div
		role="group"
		aria-label={label}
		ondragover={(event) => {
			event.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={(event) => {
			event.preventDefault();
			dragging = false;
			take(event.dataTransfer?.files);
		}}
		class={cn(
			'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-card p-6 text-center transition-colors duration-fast',
			dragging && 'border-primary bg-primary-soft'
		)}
	>
		{#if busy}
			<Loader2 class="size-6 animate-spin text-primary-dark" aria-hidden="true" />
			<p role="status" class="font-semibold">Uploading…</p>
		{:else}
			<Upload class="size-6 text-primary-dark" aria-hidden="true" />
			<div class="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
				{#if camera}
					<!-- Only phones have a camera worth pointing at a license. -->
					<label class={cn(buttonVariants({ size: 'lg' }), pickerClass, 'md:hidden')}>
						<Camera class="mr-2 size-4" aria-hidden="true" /> Take photo
						<input class="sr-only" type="file" accept="image/*" capture="environment" onchange={picked} />
					</label>
				{/if}
				<label class={cn(buttonVariants({ size: 'lg', variant: camera ? 'outline' : 'default' }), pickerClass)}>
					{multiple ? 'Choose files' : 'Choose a file'}
					<input class="sr-only" type="file" accept={accept.join(',')} {multiple} onchange={picked} />
				</label>
			</div>
			<p class="text-sm text-muted-foreground"><span class="hidden md:inline">Or drop {multiple ? 'them' : 'it'} here. </span>{hint}</p>
		{/if}
	</div>
	{#if error}<p role="alert" class="mt-2 text-sm font-semibold text-destructive">{error}</p>{/if}
</div>
