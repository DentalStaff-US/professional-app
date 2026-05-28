<script lang="ts">
    import Input from '$lib/components/ui/input/input.svelte';
    import Button from '$lib/components/ui/button/button.svelte';
    import {Trash} from 'lucide-svelte';
    import type {PageData} from './$types';

    export let data: PageData;
    $: conversations = data.conversations;
    $: console.log(conversations);
</script>

<svelte:head>
    <title>Inbox | DTSS</title>
</svelte:head>

<section class="container flex flex-col gap-6 pb-16 max-w-2xl px-4">
    <h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">Inbox</h1>
    <div class="flex justify-between items-center gap-4">
        <Input placeholder="Search Inbox"/>
        <!-- <Button><MessageSquarePlus /></Button> -->
    </div>

    <div class="divide-y-2">
        {#if conversations}
            {#each conversations as conversation}

                <a href={`/inbox/${conversation.id}`}>
                    <div
                            class="hover:bg-gray-100 p-4 flex items-center justify-between gap-8 cursor-pointer"
                    >
                        <div class="grow w-full">
                            {#if conversation?.applicationData}
                                <p class="font-semibold">{conversation.applicationData.requisition.disciplineName}</p>
                                <p class="text-sm">{conversation.applicationData.company.name}</p>
                            {:else}
                                {@const
                                    otherParticipant = conversation.participants.find(p => p.user.id !== data.user.id)}
                                <p class="font-semibold">{otherParticipant?.user.firstName} {otherParticipant?.user.lastName}</p>
                            {/if}
                            <p class="text-gray-400 text-sm">
                                {new Date(conversation.lastMessage.createdAt).toLocaleString()}
                            </p>
                            <p class="truncate max-w-[250px] sm:max-w-md mt-2">
                                {conversation.lastMessage.body}
                            </p>
                        </div>
                        <!-- <Button class="bg-transparent hover:bg-gray-50 group"
                            ><Trash class="text-gray-400 group-hover:text-red-400" /></Button
                        > -->
                    </div>
                </a>

            {/each}
        {/if}
    </div>
</section>
