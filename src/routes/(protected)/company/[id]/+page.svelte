<script>
	import { faker } from "@faker-js/faker";
	import {Button} from "$lib/components/ui/button"
	import { Heart, MapPin, CircleDollarSign, Briefcase } from "lucide-svelte";

	export let data;

	$: company = data.company
	$: requisitions = data.requisitions

</script>

<svelte:head>
  <title>{company.companyName} | DTSS</title>
</svelte:head>

<section class="container flex flex-col gap-6 pb-16 max-w-5xl">
    <div class="flex justify-between w-full">
        <div class="space-y-4">
            <img class="h-20 w-20 rounded-sm" alt="Company Logo" src={company.companyLogo}/>
            <p class="text-2xl md:text-4xl font-bold">{company.companyName}</p>
            <p>{company.baseLocation}</p>
        </div>
    </div>
    <div class="space-y-2">
        <p class="text-xl md:text-2xl font-semibold">About Company</p>
       <p class=" text-sm whitespace-pre-wrap">{company.companyDescription}</p>
    </div>
    <div class="space-y-6">
        <p class="font-bold text-xl md:text-2xl">Openings for this company</p>
        <div class="grid grid-cols-2 gap-8">
            {#each requisitions as opening}
                <div class="col-span-2 md:col-span-1">
                    <div class="p-4 flex flex-col gap-6 border border-gray-300 rounded-md relative">
                        <div class="flex flex-col gap-4 w-full">
                            <div class="flex justify-between items-start">
                                <img alt="" class="h-20 w-20 rounded-md" src={company.companyLogo}/>
                                <div class="hover:bg-gray-100 rounded-sm flex items-center justify-center p-2">
                                    <Heart class="text-black"/>
                                </div>
                            </div>
                            <div>
                                <p class="font-semibold text-2xl">{opening.disciplineName}</p>
                                <p>{company.companyName}</p>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-1">
                                <MapPin size={18} class="text-gray-500" />
                                <p class="text-sm">{opening.location.city}, {opening.location.state}</p>
                            </div>
                            <div class="flex items-center gap-1">
                                <CircleDollarSign size={18} class="text-gray-500" />
                                <p class="text-sm">${opening.hourlyRate}/hr</p>
                            </div>
                            <div class="flex items-center gap-1">
                                <Briefcase size={18} class="text-gray-500" />
                                <p class="text-sm">{opening.permanentPosition ? "Permanent" : "Temporary"} Hire</p>
                            </div>
                        </div>
                        <a class="w-full" href={`/jobs/${opening.id}`}><Button class="w-full">View Opening</Button></a>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>
