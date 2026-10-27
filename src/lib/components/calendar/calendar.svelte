<script lang="ts">
	// @ts-ignore
	import Calendar from '@event-calendar/core';
	// @ts-ignore
	import TimeGrid from '@event-calendar/time-grid';
	// @ts-ignore
	import DayGrid from '@event-calendar/day-grid';
	import '@event-calendar/core/index.css';
	import type { CalendarEvent } from './utils';

	export let events: any;
	export let selectEvent: (event: CalendarEvent) => void;
	/** Optional YYYY-MM-DD to open on (and highlight). Read once, at mount. */
	export let initialDate: string | null = null;

	// Captured once: event-calendar re-applies only options whose value changed,
	// so a constant here never yanks the view back after the user navigates.
	const focus = initialDate;

	let plugins = [DayGrid, TimeGrid];
	$: options = {
		view: 'dayGridMonth',
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: 'dayGridMonth,timeGridWeek,timeGridDay'
		},
		events,
		...(focus ? { date: focus, highlightedDates: [focus] } : {}),
		views: {
			timeGridWeek: { pointer: true },
			resourceTimeGridWeek: { pointer: true }
		},
		// dayMaxEvents: true,
		nowIndicator: true,
		selectable: true,
		displayEventEnd: true,
		eventClick: (item: any) => {
			selectEvent(item.event);
		}
	};
</script>

<Calendar {plugins} {options} />
