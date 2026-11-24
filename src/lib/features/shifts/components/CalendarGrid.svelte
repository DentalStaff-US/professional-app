<script lang="ts">
	import { cn } from '$lib/utils';
	import { formatShiftDate } from '../format';

	export type DayMarks = { open: number; claimed: number; off: number };

	let {
		days,
		currentMonth = null,
		today,
		selected = null,
		marks,
		off = new Set(),
		onselect
	}: {
		days: string[];
		/** 'YYYY-MM' in month mode, so days outside it can be dimmed. */
		currentMonth?: string | null;
		today: string;
		selected?: string | null;
		marks: Map<string, DayMarks>;
		/** Days they've said they can't work. */
		off?: Set<string>;
		onselect: (date: string) => void;
	} = $props();

	const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

	function describe(date: string, mark?: DayMarks) {
		const parts = [
			mark?.open ? `${mark.open} open` : '',
			mark?.claimed ? `${mark.claimed} claimed` : '',
			off.has(date) ? 'day off' : '',
			mark?.off ? `${mark.off} open on a day you marked off` : ''
		].filter(Boolean);
		return [formatShiftDate(`${date}T00:00:00Z`), ...parts].join(', ');
	}
</script>

<div class="grid grid-cols-7 gap-1" role="group" aria-label="Choose a day">
	{#each WEEKDAYS as day, i (i)}
		<span class="pb-1 text-center text-xs font-semibold text-muted-foreground" aria-hidden="true">{day}</span>
	{/each}
	{#each days as date (date)}
		{@const mark = marks.get(date)}
		{@const outside = currentMonth !== null && !date.startsWith(currentMonth)}
		<button
			type="button"
			aria-label={describe(date, mark)}
			aria-pressed={selected === date}
			aria-current={date === today ? 'date' : undefined}
			onclick={() => onselect(date)}
			class={cn(
				'flex min-h-12 flex-col items-center rounded-md border border-transparent p-1 text-sm transition-colors duration-fast hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-20 md:items-start md:p-2',
				off.has(date) && 'bg-muted text-muted-foreground',
				date === today && 'bg-primary-soft font-bold text-primary-dark',
				selected === date && 'border-primary',
				outside && 'text-muted-foreground/60'
			)}
		>
			<span class="font-semibold">{Number(date.slice(8))}</span>

			<!-- Dots on phones, where there's no room for words. -->
			<span class="mt-1 flex h-1.5 gap-0.5 md:hidden" aria-hidden="true">
				{#if mark?.open}<span class="size-1.5 rounded-full bg-status-info-solid"></span>{/if}
				{#if mark?.claimed}<span class="size-1.5 rounded-full bg-status-positive-solid"></span>{/if}
				{#if off.has(date) || mark?.off}<span class="size-1.5 rounded-full bg-status-neutral-solid"></span>{/if}
			</span>
			<span class="mt-1 hidden w-full flex-col gap-0.5 text-left text-xs font-semibold md:flex" aria-hidden="true">
				{#if mark?.claimed}<span class="truncate rounded bg-status-positive-bg px-1.5 py-0.5 text-status-positive-fg">{mark.claimed} claimed</span>{/if}
				{#if mark?.open}<span class="truncate rounded bg-status-info-bg px-1.5 py-0.5 text-status-info-fg">{mark.open} open</span>{/if}
				{#if off.has(date) || mark?.off}<span class="truncate rounded bg-status-neutral-bg px-1.5 py-0.5 text-status-neutral-fg">Day off</span>{/if}
			</span>
		</button>
	{/each}
</div>
