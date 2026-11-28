import { invalidate } from '$app/navigation';
import { inboxSocketConnected } from '$lib/inboxSocket';

/**
 * The fallback for when the socket can't connect, such as behind a strict network.
 * Refreshes while the tab is visible and the socket is down. Returns a stop function.
 */
export function pollWhileVisible(dependency: string, intervalMs = 15000): () => void {
	const timer = setInterval(() => {
		if (document.visibilityState === 'visible' && !inboxSocketConnected()) invalidate(dependency);
	}, intervalMs);
	return () => clearInterval(timer);
}
