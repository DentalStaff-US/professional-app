<script lang="ts">
    import {browser} from '$app/environment';
    import * as Avatar from '$lib/components/ui/avatar';
    import Button from '$lib/components/ui/button/button.svelte';
    import {Input} from '$lib/components/ui/input';
    import {ArrowLeft, SendIcon} from 'lucide-svelte';
    import {superForm} from 'sveltekit-superforms/client';
    import type {PageData} from './$types';
    import {Textarea} from '$lib/components/ui/textarea';
    import {afterUpdate, onMount} from 'svelte';

    export let data: PageData;
    let shouldScroll = false;

    const {form, enhance, errors} = superForm(data.form);

    function goBack() {
        if (browser) window.history.back();
    }

    $: user = data.user;
    $: conversation = data.conversation;
    $: ({messages} = conversation);
    $: ({participants} = conversation);
    $: [chatUser] = participants.filter((u) => u.userId !== user?.id);

    $: console.log(conversation)

    $: if (messages) {
        shouldScroll = true;
    }

    onMount(() => {
        scrollToBottom();
    });

    afterUpdate(() => {
        if (shouldScroll) {
            scrollToBottom();
            shouldScroll = false;
        }
    });

    const scrollToBottom = () => {
        if (typeof document !== 'undefined') {
            const container = document?.getElementById('app-main');
            const bottom = document?.getElementById('anchor');
            bottom?.scrollIntoView();
        }
    };
</script>

<svelte:head>
    <title>Conversation | DTSS</title>
</svelte:head>

<section class="container flex flex-col gap-6 max-w-2xl grow px-4">
    <div class="flex items-center gap-4" id="container">
        <Button on:click={goBack} variant="ghost">
            <ArrowLeft/>
        </Button>
        {#if conversation.type === 'APPLICATION'}
            <div class="grow flex gap-4 items-center">
                <div>
                    <Avatar.Root>
                        <Avatar.Image src={conversation.applicationData.company.companyLogo}/>
                    </Avatar.Root>
                </div>
                <div>
                    <p class="text-xl md:text-2xl font-semibold">
                        {conversation?.applicationData?.requisition.disciplineName}
                    </p>
                    <p>{conversation.applicationData?.company.companyName}</p>
                </div>
            </div>
        {:else}
            <div class="grow flex gap-4 items-center">
                <div>
                    <Avatar.Root>
                        <Avatar.Image src={chatUser?.avatarUrl}/>
                    </Avatar.Root>
                </div>
                <div>
                    <p class="text-xl md:text-2xl font-semibold">
                        {chatUser?.firstName} {chatUser?.lastName}
                    </p>
                </div>
            </div>
        {/if}
    </div>
    <div class="grow overflow-x-scroll max-h-[5 hybny00px] flex flex-col gap-4 py-4">
        {#each messages as message}
            {#if message.senderId === user.id}
                <div class="self-end ml-auto flex flex-row-reverse gap-2 max-w-sm sm:max-w-md">
                    <div class="p-2 rounded-lg rounded-tr-none bg-primary text-white">
                        {message.body}
                    </div>
                </div>
            {:else}
                <div class="self-start mr-auto flex gap-2 max-w-sm sm:max-w-md">
                    <div class="p-2 rounded-lg rounded-tl-none bg-gray-100">{message.body}</div>
                </div>
            {/if}
        {/each}
        <div id="anchor"></div>
    </div>
    <form class="flex items-center gap-4" method="POST" use:enhance>
        {#if $errors.body}
            <span class="error">{$errors.body}</span>
        {/if}
        <Textarea name="body" bind:value={$form.body} placeholder="Type your message..."/>
        <Button type="submit">
            <SendIcon/>
        </Button>
    </form>
</section>
