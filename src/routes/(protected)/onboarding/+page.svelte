<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import * as Form from '$lib/components/ui/form';
  import * as Select from "$lib/components/ui/select";
  import * as Alert from '$lib/components/ui/alert';
  import { AlertCircle, Loader } from 'lucide-svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import { newProfileSchema } from '$lib/config/zod-schemas';
  import type { PageData } from './$types';
  import {STATES} from '$lib/config/constants';
  import { superForm } from 'sveltekit-superforms/client';
  import Button from '$lib/components/ui/button/button.svelte';
	import AvatarUpload from '$lib/components/general/avatar-upload.svelte';
	import { tick } from 'svelte';
  import AddressSearchAutocomplete from "$lib/components/AddressSearchAutocomplete.svelte";
  import type {AddressResult} from "$lib/types";
  import {Label} from "$lib/components/ui/label";


  export let data: PageData
  $: user = data.user

  const form = superForm(data.form)
  const avatarForm = superForm(data.avatarForm)

  const { enhance, form: formData, errors, submitting } = form
  const { form: formAvatar, enhance: avatarEnhance, errors: avatarError } = avatarForm
  $: selectedState = $formData.state
      ? {
          label: $formData.state,
          value: $formData.state
        }
      : undefined;

  async function handleAvatarUpdated(url: string) {
    $formAvatar.url = url;

    // Wait for Svelte to update the DOM
    await tick();

    if ($formAvatar.url.length) {
      const form = document.getElementById('avatar-url-form') as HTMLFormElement;
      if (form) {
        // Ensure the hidden input has the value
        const input = form.querySelector('input[name="url"]') as HTMLInputElement;
        if (input) {
          input.value = url;
        }
        form.requestSubmit(); // Use the native submit instead of dispatchEvent
      }
    }
  }

  let selectedAddress: AddressResult | null = null;
  let selectedTimezone = '';

  function handleAddressSelect(event: CustomEvent<AddressResult>) {
      const address = event.detail;
      selectedAddress = address;
  }

  function handleClear() {
      selectedAddress = null;
  }
</script>

<svelte:head>
  <title>Profile Setup | DTSS</title>
</svelte:head>

<section class="sm:container grid items-center gap-6 max-w-2xl">
	<Card.Root class="border-0 sm:border">
	<Card.Header class="space-y-1">
		<Card.Title class="text-2xl">Let's set up your profile</Card.Title>
		<Card.Description>Enter your profile settings below.</Card.Description>
	</Card.Header>
	<Card.Content>
	<AvatarUpload {user} onAvatarUpdated={handleAvatarUpdated} />
        <form id="avatar-url-form" class="hidden" method="POST" action="?/avatarUpload" use:avatarEnhance>
            <input type="hidden" name="url" bind:value={$formAvatar.url}/>
        </form>
        {#if $avatarError._errors?.length}
            <Alert.Root variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>
                    {$avatarError.url}
                </Alert.Description>
            </Alert.Root>
        {/if}
    <form id="profileForm" action="?/submitProfile" method="POST" use:enhance>
        <div  class="grid gap-2 grid-cols-8">
        {#if $errors._errors?.length}
            <Alert.Root variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>
                    {#each $errors._errors as error}
                        {error}
                    {/each}
                </Alert.Description>
            </Alert.Root>
        {/if}
        <div class="col-span-8 mb-4">
            <Label>Address</Label>
            <AddressSearchAutocomplete
                    bind:selected={selectedAddress}
                    on:select={handleAddressSelect}
                    on:clear={handleClear}
                    placeholder="Enter your address..."
                    country="us"
                    maxResults={8}
            />
            <input type="hidden" name="completeAddress" value={selectedAddress?.formatted_address}/>
            <input type="hidden" name="lat" value={selectedAddress?.coordinates.lat}/>
            <input type="hidden" name="lon" value={selectedAddress?.coordinates.lng}/>
        </div>

        <div class="col-span-8 sm:col-span-4">
            <Form.Field config={{form: form, schema: newProfileSchema}} name="birthday">
                <Form.Item>
                    <Form.Label>Birthday</Form.Label>
                    <Form.Input type="date" />
                    <Form.Validation />
                </Form.Item>
            </Form.Field>
        </div>
        <div class="col-span-8 sm:col-span-4">
            <Form.Field config={{form: form, schema: newProfileSchema}} name="cellPhone">
                <Form.Item>
                    <Form.Label>Cell Phone #</Form.Label>
                    <Form.Input
                        type="tel"
                        inputmode="numeric"
                        placeholder="(555) 555-5555"
                        on:input={(event) => {
                            // (XXX) XXX-XXXX masking. Drop a leading "1" so we
                            // always show the local 10 digits. Server normalizes
                            // to E.164 via the `usPhoneField()` zod transform.
                            const digits = event.currentTarget.value.replace(/\D/g, '');
                            const local =
                                digits.length === 11 && digits.startsWith('1')
                                    ? digits.slice(1)
                                    : digits;
                            const trimmed = local.slice(0, 10);
                            let formatted = '';
                            if (trimmed.length === 0) formatted = '';
                            else if (trimmed.length <= 3) formatted = `(${trimmed}`;
                            else if (trimmed.length <= 6)
                                formatted = `(${trimmed.slice(0, 3)}) ${trimmed.slice(3)}`;
                            else
                                formatted = `(${trimmed.slice(0, 3)}) ${trimmed.slice(
                                    3,
                                    6
                                )}-${trimmed.slice(6)}`;

                            event.currentTarget.value = formatted;
                            $formData.cellPhone = formatted;
                        }}
                    />
                    <Form.Validation />
                </Form.Item>
            </Form.Field>
        </div>
        </div>
    </form>
	</Card.Content>
	<Card.Footer>
            <Button type="submit" form={"profileForm"} class="w-full sm:w-fit ml-auto bg-blue-800 hover:bg-blue-900">
                {#if $submitting}
                    <Loader class="animate-spin h-4 w-4 mr-2" />
                    Saving...
                {:else}
                    Save Profile
                {/if}
            </Button>
	</Card.Footer>
	</Card.Root>
</section>
