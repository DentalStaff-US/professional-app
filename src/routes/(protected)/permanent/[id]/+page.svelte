<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Briefcase, CircleDollarSign, Heart, Lock, MapPin, Calendar } from 'lucide-svelte';
	import LockedPracticeDetails from '$lib/components/general/LockedPracticeDetails.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { RequisitionApplicationSchema } from '$lib/config/zod-schemas.js';

	export let data;
	$: opening = data.requisition;
	$: saved = data.saved;
	$: myApplicationStatus = data.myApplicationStatus as
		| 'PENDING'
		| 'APPROVED'
		| 'DENIED'
		| null;
	$: reqStatus = data.reqStatus as string | null;
	$: canApply = data.canApply;

	// Req status pill — only shown when the req is past OPEN. Maps the perm
	// lifecycle (CANCELED / CLOSED / PAYMENT_REQUIRED / PAYMENT_RECEIVED) to a
	// candidate-friendly label + color. Admin payment-flow states surface as
	// "Position filled" because the candidate doesn't care about billing.
	$: statusPill = (() => {
		if (!reqStatus || reqStatus === 'OPEN') return null;
		if (reqStatus === 'CANCELED')
			return { label: 'Cancelled', classes: 'bg-red-50 text-red-800 border-red-200' };
		if (reqStatus === 'CLOSED')
			return { label: 'Closed', classes: 'bg-gray-100 text-gray-800 border-gray-200' };
		// PAYMENT_REQUIRED / PAYMENT_RECEIVED — both display as filled to the candidate.
		return { label: 'Position filled', classes: 'bg-amber-50 text-amber-800 border-amber-200' };
	})();

	// Apply button label tracks the strongest signal: application status wins
	// over req status (an applicant always sees their app status), then
	// req-status-derived disabled labels, then the default "Apply For Opening".
	$: applyButton = (() => {
		if (myApplicationStatus === 'PENDING')
			return { label: 'Application Pending', disabled: true };
		if (myApplicationStatus === 'APPROVED') return { label: 'Approved', disabled: true };
		if (myApplicationStatus === 'DENIED')
			return { label: 'Not Under Consideration', disabled: true };
		if (canApply) return { label: 'Apply For Opening', disabled: false };
		return { label: 'Not Accepting Applications', disabled: true };
	})();

	export let applyForm: SuperValidated<RequisitionApplicationSchema>;
	const { enhance: applicationFormEnhance } = superForm(applyForm);
</script>

<svelte:head>
	<title>{opening?.disciplineName ?? 'Position unavailable'} | DTSS</title>
</svelte:head>

{#if !opening}
	<!-- True 404: req doesn't exist, is hard-archived, owning business is
	     inactive (for non-applicants), or fell outside the calendar-year
	     cutoff. Render a friendly state so the candidate has somewhere to go. -->
	<section
		class="container flex flex-col items-center gap-4 pt-20 pb-16 max-w-2xl px-4 text-center"
	>
		<Briefcase size={48} class="text-gray-400" />
		<h1 class="text-2xl font-bold">This position is no longer available</h1>
		<p class="text-gray-600">
			It may have been filled, closed, or removed by the posting business. Browse other openings to
			find your next role.
		</p>
		<Button href="/permanent">Back to openings</Button>
	</section>
{:else}
	<section class="container flex flex-col gap-6 pb-16 max-w-5xl px-4">
		<!-- Application status banner. Drives most of the post-apply UX; the req
		     status pill below is purely informational. No emojis per house style. -->
		{#if myApplicationStatus === 'PENDING'}
			<div
				class="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900"
				role="status"
			>
				<strong>Application pending</strong> — your application has been submitted and is awaiting
				review by the business.
			</div>
		{:else if myApplicationStatus === 'APPROVED'}
			<div
				class="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
				role="status"
			>
				<strong>Your application was approved.</strong> The business will be in touch with next
				steps.
			</div>
		{:else if myApplicationStatus === 'DENIED'}
			<div
				class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
				role="status"
			>
				Thank you for applying. This business has moved forward with another application. We hope
				to have more positions available soon.
			</div>
		{/if}

		<div class="flex justify-between w-full">
			<div class="space-y-4">
				{#if opening.identityLocked}
					<div
						class="h-12 w-12 md:h-20 md:w-20 rounded-sm bg-gray-100 flex items-center justify-center text-gray-400"
					>
						<Lock size={24} />
					</div>
				{:else}
					<img
						class="h-12 w-12 md:h-20 md:w-20 rounded-sm"
						alt="Company Logo"
						src={opening.company.companyLogo}
					/>
				{/if}
				<div>
					<div class="flex items-center gap-2 flex-wrap">
						<p class="text-2xl md:text-4xl font-bold">{opening.disciplineName}</p>
						{#if statusPill}
							<span
								class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium {statusPill.classes}"
							>
								{statusPill.label}
							</span>
						{/if}
					</div>
					<p class="text-sm text-gray-500">Req #{opening.id}</p>
				</div>
				{#if !opening.identityLocked}
					<a class="underline" href={`/company/${opening.company.id}`}
						>{opening.company.companyName}</a
					>
				{/if}
				<div class="flex flex-col gap-2">
					{#if opening.identityLocked}
						<LockedPracticeDetails
							city={opening.location?.city}
							state={opening.location?.state}
							distanceMiles={opening.location?.distanceMiles}
							unlockMessage="The practice name and address are revealed once your application is approved."
						/>
					{:else}
						<div class="flex items-start gap-1">
							<MapPin size={18} class="text-gray-500 shrink-0 mt-0.5" />
							<p class="text-sm">{opening.location.completeAddress}</p>
						</div>
					{/if}
					<div class="flex items-center gap-1">
						<Calendar size={18} class="text-gray-500" />
						<p class="text-sm">Opening Date(s)</p>
					</div>
					<div class="flex items-center gap-1">
						<CircleDollarSign size={18} class="text-gray-500" />
						<p class="text-sm">${opening.hourlyRate}/hr</p>
					</div>
					<div class="flex items-center gap-1">
						<Briefcase size={18} class="text-gray-500" />
						<p class="text-sm">{opening.permanentPosition ? 'Permanent' : 'Temporary'} Hire</p>
					</div>
				</div>
			</div>
			<div class="hidden md:flex gap-2 grow-0">
				<form method="POST" action="?/applyForOpening" use:applicationFormEnhance>
					<input type="hidden" name="requisitionId" value={opening.id} />
					<Button disabled={applyButton.disabled} type="submit">{applyButton.label}</Button>
				</form>
				<!-- <form action="?/toggleSave">
					<Button variant="ghost" class="p-2  rounded-md grow-0 flex items-center justify-center h-fit">
						<Heart size={24} fill={saved ? "#ff4252" : "white"} color={saved ? "#ff4252" : "black"} />
					</Button>
				</form> -->
			</div>
		</div>
		<div class="space-y-4">
			<p class="text-xl font-semibold">Job Description</p>
			<p class="whitespace-pre-wrap">{opening?.jobDescription}</p>
		</div>
		<div class="space-y-4">
			<p class="text-xl font-semibold">Special Instructions</p>
			<p class="whitespace-pre-wrap">{opening?.specialInstructions || 'None'}</p>
		</div>
		<div class="md:hidden absolute bottom-0 left-0 right-0 flex gap-2 p-4 border-t border-gray-700">
			<form
				method="POST"
				action="?/applyForOpening"
				use:applicationFormEnhance
				class="grow"
			>
				<input type="hidden" name="requisitionId" value={opening.id} />
				<Button class="w-full" disabled={applyButton.disabled} type="submit">
					{applyButton.label}
				</Button>
			</form>
			<div class="p-2 border border-gray-700 rounded-md">
				<Heart size={24} />
			</div>
		</div>
	</section>
{/if}
