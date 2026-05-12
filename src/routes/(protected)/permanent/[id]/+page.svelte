<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Briefcase, CircleDollarSign, Heart, MapPin, Calendar } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { RequisitionApplicationSchema } from '$lib/config/zod-schemas.js';

	export let data;
	$: opening = data.requisition;
	$: saved = data.saved;
	$: applied = data.appliedToOpening;

	export let applyForm: SuperValidated<RequisitionApplicationSchema>;
	const { enhance: applicationFormEnhance } = superForm(applyForm);
</script>

<svelte:head>
	<title>{opening.disciplineName} | DentalStaff.US</title>
</svelte:head>

<section class="container flex flex-col gap-6 pb-16 max-w-5xl px-4">
	<div class="flex justify-between w-full">
		<div class="space-y-4">
			<img
				class="h-12 w-12 md:h-20 md:w-20 rounded-sm"
				alt="Company Logo"
				src={opening.company.companyLogo}
			/>
			<p class="text-2xl md:text-4xl font-bold">{opening.disciplineName}</p>
			<a class="underline" href={`/company/${opening.company.id}`}>{opening.company.companyName}</a>
			<div class="flex flex-col gap-2">
				<div class="flex items-start gap-1">
					<MapPin size={18} class="text-gray-500 shrink-0 mt-0.5" />
					<p class="text-sm">{opening.location.completeAddress}</p>
				</div>
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
				<Button disabled={applied} type="submit">
					{#if applied}
						Application Submitted
					{:else}
						Apply For Opening
					{/if}
				</Button>
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
		<!-- Job Description -->
		<p class="whitespace-pre-wrap">{opening?.jobDescription}</p>
	</div>
	<div class="space-y-4">
		<p class="text-xl font-semibold">Special Instructions</p>
		<p class="whitespace-pre-wrap">{opening?.specialInstructions || 'None'}</p>
	</div>
	<div class="md:hidden absolute bottom-0 left-0 right-0 flex gap-2 p-4 border-t border-gray-700">
		<Button class="grow">Apply For Opening</Button>
		<div class="p-2 border border-gray-700 rounded-md">
			<Heart size={24} />
		</div>
	</div>
</section>
