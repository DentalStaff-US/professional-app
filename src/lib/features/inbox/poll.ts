import { invalidate } from '$app/navigation';

/** Refreshes a load while the tab is visible, so conversations feel live. Returns a stop function. */
export function pollWhileVisible(dependency: string, intervalMs = 15000): () => void {
	const timer = setInterval(() => {
		if (document.visibilityState === 'visible') invalidate(dependency);
	}, intervalMs);
	return () => clearInterval(timer);
}
