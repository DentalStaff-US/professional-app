<!--
  "You're set to permanent positions only" — the notice on a board the
  professional's own work-type preference has emptied.

  Third member of the same family as CertLockedBanner and
  AvailabilityHiddenBanner, and it exists for the identical reason: a job board
  that silently goes empty is the worst thing this app can do to someone. Each of
  those three answers a different "why is nothing here", and they are deliberately
  separate components rather than one generic one, because the fix differs — upload
  a credential, edit your days off, or change one radio button.

  Default Alert variant, not destructive: this is the professional's own choice,
  working as intended. The CTA goes straight to the setting that caused it.

  The server supplies `excluded` already worded (workPreferenceExclusionReason in
  the admin app's $lib/server/workPreference) and sends null whenever the
  preference is NOT the reason — so this renders nothing on a board that is empty
  for some other cause, and cannot shadow the real explanation.
-->
<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Briefcase } from 'lucide-svelte';

	/** The `workPreference` block from any of the candidate-facing listing endpoints. */
	export let workPreference:
		| {
				preference: 'TEMP' | 'PERMANENT' | 'BOTH' | null;
				excluded: { preference: string; message: string } | null;
		  }
		| undefined = undefined;

	$: excluded = workPreference?.excluded ?? null;
</script>

{#if excluded}
	<Alert.Root class="mb-4">
		<Briefcase class="h-4 w-4" />
		<Alert.Title>
			{excluded.preference === 'PERMANENT'
				? 'Temporary shifts are hidden'
				: 'Permanent positions are hidden'}
		</Alert.Title>
		<Alert.Description class="space-y-3">
			<p>{excluded.message}</p>
			<Button href="/settings/edit-profile" size="sm" variant="outline">
				Change what you're looking for
			</Button>
		</Alert.Description>
	</Alert.Root>
{/if}
