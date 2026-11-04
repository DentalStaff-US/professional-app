<script lang="ts">
	import { page } from '$app/state';
	import { ShiftDetailPage } from '$features/shifts';
	import AppShell from '$shell/AppShell.svelte';
	import { shiftDetail } from '../../fixtures';

	const state = $derived(page.url.searchParams.get('state'));
	const shift = $derived(
		state === 'missing'
			? null
			: state === 'cancelled'
				? { ...shiftDetail, recurrenceDay: { ...shiftDetail.recurrenceDay, status: 'CANCELED' } }
				: shiftDetail
	);
</script>

<AppShell pathname="/my-shifts/w1" name="Maria Lopez" email="maria@example.com" initials="ML">
	<ShiftDetailPage {shift} />
</AppShell>
