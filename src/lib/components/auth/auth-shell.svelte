<script lang="ts">
	// Shared branded shell for the PROFESSIONALS (candidate) app's auth pages.
	// Deliberately differentiated from the client/admin app: a teal gradient +
	// a prominent "Professional Portal" badge, so dental professionals can tell
	// at a glance they're on the right app (a frequent source of confusion).
	import logo from '$lib/assets/dtss-logo.png';
</script>

<div
	class="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-4"
>
	<div class="w-full max-w-md">
		<div class="mb-6 flex flex-col items-center gap-3">
			<img
				src={logo}
				alt="Dental Temps Staffing Solutions"
				class="h-20 w-auto max-w-[260px] object-contain"
			/>
			<span
				class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
			>
				Professional Portal
			</span>
		</div>
		<slot />
	</div>
</div>
