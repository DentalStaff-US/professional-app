<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { userSchema } from '$lib/config/zod-schemas';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { Loader2, AlertCircle } from 'lucide-svelte';
	import AuthShell from '$lib/components/auth/auth-shell.svelte';

	const signUpSchema = userSchema.pick({
		firstName: true,
		lastName: true,
		email: true,
		password: true,
		terms: true
	});

	type SignUpSchema = typeof signUpSchema;

	export let form: SuperValidated<SignUpSchema>;
</script>

<svelte:head>
	<title>Sign Up | DTSS Professionals</title>
</svelte:head>

<AuthShell>
	<Form.Root let:submitting let:errors method="POST" {form} schema={signUpSchema} let:config>
		<Card.Root class="border-slate-200/80 shadow-xl shadow-teal-900/5">
			<Card.Header class="space-y-1">
				<Card.Title class="text-2xl">Create your account</Card.Title>
				<Card.Description>
					Already have an account?
					<a href="/auth/sign-in" class="font-medium text-primary hover:underline">Sign in</a>
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4">
				{#if errors?._errors?.length}
					<Alert.Root variant="destructive">
						<AlertCircle class="h-4 w-4" />
						<Alert.Title>Error</Alert.Title>
						<Alert.Description>
							{#each errors._errors as error}
								{error}
							{/each}
						</Alert.Description>
					</Alert.Root>
				{/if}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Form.Field {config} name="firstName">
						<Form.Item>
							<Form.Label>First name</Form.Label>
							<Form.Input />
							<Form.Validation />
						</Form.Item>
					</Form.Field>
					<Form.Field {config} name="lastName">
						<Form.Item>
							<Form.Label>Last name</Form.Label>
							<Form.Input />
							<Form.Validation />
						</Form.Item>
					</Form.Field>
				</div>
				<Form.Field {config} name="email">
					<Form.Item>
						<Form.Label>Email address</Form.Label>
						<Form.Input type="email" autocomplete="email" placeholder="you@example.com" />
						<Form.Validation />
					</Form.Item>
				</Form.Field>
				<Form.Field {config} name="password">
					<Form.Item>
						<Form.Label>Password</Form.Label>
						<Form.Input type="password" autocomplete="new-password" />
						<Form.Validation />
					</Form.Item>
				</Form.Field>
				<Form.Field {config} name="terms">
					<Form.Item
						class="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 p-4"
					>
						<Form.Checkbox />
						<div class="space-y-1 leading-none">
							<Form.Label>I accept the terms and privacy policy.</Form.Label>
							<Form.Description>
								You agree to the <a href="/terms" class="text-primary underline">terms</a> and
								<a href="/privacy" class="text-primary underline">privacy policy</a>.
							</Form.Description>
						</div>
					</Form.Item>
				</Form.Field>
			</Card.Content>
			<Card.Footer>
				<Form.Button
					class="h-11 w-full bg-primary text-base hover:bg-primary/90"
					disabled={submitting}
				>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Please wait
					{:else}
						Create account
					{/if}
				</Form.Button>
			</Card.Footer>
		</Card.Root>
	</Form.Root>
</AuthShell>
