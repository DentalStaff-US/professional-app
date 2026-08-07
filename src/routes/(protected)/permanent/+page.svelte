<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import { Briefcase, CircleDollarSign, Heart, Lock, MapPin } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import LockedPracticeDetails from '$lib/components/general/LockedPracticeDetails.svelte';
	import { isPracticeLocked } from '$lib/_helpers/practiceIdentity';

	export let data;
	$: requisitions = data.requisitions;
	$: applied = data.applied;

	// An applied requisition shouldn't also surface in the Recommended tab —
	// the candidate has already engaged with it, the Applied tab is where they
	// track its progress. `applied` is the response from
	// /api/external/getAppliedRequisitions, which exposes the requisition id
	// directly at the top level (`id: requisitionTable.id` in that endpoint's
	// select), so a Set of those ids dedupes the Recommended tab cleanly.
	$: appliedRequisitionIds = new Set((applied ?? []).map((a: any) => a?.id));
	$: openRequisitions = (requisitions ?? []).filter(
		(o: any) => !appliedRequisitionIds.has(o.id)
	);
</script>

<svelte:head>
	<title>Permanent Jobs | DTSS</title>
</svelte:head>

<section class="container grid items-center gap-6 px-4">
	<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
		Permanent Positions
	</h1>
	<Tabs.Root value="Recommended">
		<Tabs.List class="gap-6">
			<Tabs.Trigger value="Recommended">Recommended</Tabs.Trigger>
			<Tabs.Trigger value="Applied">Applied</Tabs.Trigger>
			<!-- <Tabs.Trigger value="Saved">Saved</Tabs.Trigger> -->
		</Tabs.List>
		<Tabs.Content value="Recommended">
			<div class="grid grid-cols-6 gap-8 mt-8">
				<!-- Opening Card Item -->
				{#each openRequisitions as opening}
					<div class="col-span-6 md:col-span-3 lg:col-span-2">
						<div class="p-4 flex flex-col gap-6 border border-gray-300 rounded-md relative">
							<div class="flex flex-col gap-4 w-full">
								<div class="flex justify-between items-start">
									{#if isPracticeLocked(opening)}
										<div
											class="h-24 w-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400"
										>
											<Lock size={28} />
										</div>
									{:else}
										<img alt="" class="h-24 w-24 rounded-md" src={opening.company.companyLogo} />
									{/if}
									<!-- <div class="hover:bg-gray-100 rounded-sm flex items-center justify-center p-2">
										<Heart class="text-black" />
									</div> -->
								</div>
								<div>
									<p class="font-semibold text-2xl">{opening.disciplineName}</p>
									<p class="text-xs text-gray-500">Req #{opening.id}</p>
									{#if !isPracticeLocked(opening)}
										<p>{opening.company.companyName}</p>
									{/if}
								</div>
							</div>
							<div class="flex flex-col gap-2">
								{#if isPracticeLocked(opening)}
									<LockedPracticeDetails
										city={opening.location?.city}
										state={opening.location?.state}
										distanceMiles={opening.distanceMiles ?? opening.location?.distanceMiles}
										unlockMessage="The practice is revealed once your application is approved."
									/>
								{:else}
									<div class="flex items-start gap-1">
										<MapPin size={18} class="text-gray-500 shrink-0 mt-0.5" />
										<p class="text-sm">{opening.location.completeAddress}</p>
									</div>
								{/if}
								<div class="flex items-center gap-1">
									<CircleDollarSign size={18} class="text-gray-500" />
									<p class="text-sm">${opening.hourlyRate}/hr</p>
								</div>
								<div class="flex items-center gap-1">
									<Briefcase size={18} class="text-gray-500" />
									<p class="text-sm">
										{opening.permanentPosition ? 'Permanent' : 'Temporary'} Hire
									</p>
								</div>
							</div>
							<a class="w-full" href={`/permanent/${opening.id}`}
								><Button class="w-full bg-primary text-white hover:bg-primary/90">
									View Opening
								</Button></a
							>
						</div>
					</div>
				{/each}
				{#if openRequisitions.length === 0}
					<p class="col-span-6 text-center text-gray-500">No permanent job openings available.</p>
				{/if}
			</div>
		</Tabs.Content>
		<Tabs.Content value="Applied">
			<div class="grid grid-cols-6 gap-8 mt-8">
				<!-- Opening Card Item -->
				{#each applied as appliedOpening}
					<div class="col-span-6 md:col-span-3 lg:col-span-2">
						<div class="p-4 flex flex-col gap-6 border border-gray-300 rounded-md relative">
							<div class="flex flex-col gap-4 w-full">
								<div class="flex justify-between items-start">
									{#if isPracticeLocked(appliedOpening)}
										<div
											class="h-24 w-24 rounded-md bg-gray-100 flex items-center justify-center text-gray-400"
										>
											<Lock size={28} />
										</div>
									{:else}
										<img
											alt=""
											class="h-24 w-24 rounded-md"
											src={appliedOpening?.company.companyLogo}
										/>
									{/if}
									<!-- <div class="hover:bg-gray-100 rounded-sm flex items-center justify-center p-2">
										<Heart class="text-black" />
									</div> -->
								</div>
								<div>
									<p class="font-semibold text-2xl">{appliedOpening?.disciplineName}</p>
									<p class="text-xs text-gray-500">Req #{appliedOpening?.id}</p>
									{#if !isPracticeLocked(appliedOpening)}
										<p>{appliedOpening?.company.companyName}</p>
									{/if}
								</div>
							</div>
							<div class="flex flex-col gap-2">
								{#if isPracticeLocked(appliedOpening)}
									<LockedPracticeDetails
										city={appliedOpening?.location?.city}
										state={appliedOpening?.location?.state}
										distanceMiles={appliedOpening?.location?.distanceMiles}
										unlockMessage="The practice is revealed once your application is approved."
									/>
								{:else}
									<div class="flex items-start gap-1">
										<MapPin size={18} class="text-gray-500 shrink-0 mt-0.5" />
										<p class="text-sm">
											{appliedOpening?.location.completeAddress}
										</p>
									</div>
								{/if}
								<div class="flex items-center gap-1">
									<CircleDollarSign size={18} class="text-gray-500" />
									<p class="text-sm">${appliedOpening?.hourlyRate}/hr</p>
								</div>
								<div class="flex items-center gap-1">
									<Briefcase size={18} class="text-gray-500" />
									<p class="text-sm">
										{appliedOpening?.permanentPosition ? 'Permanent' : 'Temporary'} Hire
									</p>
								</div>
							</div>
							<a class="w-full" href={`/permanent/${appliedOpening?.id}`}
								><Button class="w-full bg-primary text-white hover:bg-primary/90">
									View Opening
								</Button></a
							>
						</div>
					</div>
				{/each}

				{#if applied.length === 0}
					<p class="col-span-6 text-center text-gray-500">You have not applied to any jobs yet.</p>
				{/if}
			</div>
		</Tabs.Content>
		<Tabs.Content value="Saved">
			<div class="grid grid-cols-6 gap-8 mt-8">
				<!-- Opening Card Item -->
			</div>
		</Tabs.Content>
	</Tabs.Root>
</section>
