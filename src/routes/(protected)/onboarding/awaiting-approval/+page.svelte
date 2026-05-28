<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Progress } from '$lib/components/ui/progress';
  import { Separator } from '$lib/components/ui/separator';
  import { CheckCircle, Clock, Mail, AlertCircle } from 'lucide-svelte';
  import {PUBLIC_SUPPORT_EMAIL} from "$env/static/public"
  export let data;


  // Example submission data (replace with actual data from your API)
  const submissionData = {
    submittedAt: new Date(data.profile.createdAt),
    estimatedCompletionDays: 2,
    completedSteps: [
      { id: 1, name: "Profile Information", completed: true },
      { id: 2, name: "Experience Details", completed: true },
      { id: 3, name: "Resume Upload", completed: true },
      { id: 4, name: "Document Upload", completed: true },
      { id: 5, name: "Application Review", completed: false },
    ],
    contactEmail: "support@dentalstaff.com"
  };


  // Format the date
  function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
</script>

<svelte:head>
  <title>Awaiting Approval | DTSS</title>
</svelte:head>

<section class="sm:container max-w-4xl mx-auto px-4 py-8 space-y-8">
  <Card.Root class="border-0 sm:border shadow-none sm:shadow-sm">
    <Card.Header class="text-center">
      <Card.Title class="text-3xl font-bold">Your Application is Under Review</Card.Title>
      <Card.Description>
        Thank you for completing your profile. Our team is currently reviewing your information.
      </Card.Description>
    </Card.Header>

    <Card.Content class="space-y-6">
      <!-- Status Banner -->
      <div class="bg-blue-50 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Clock class="h-10 w-10 text-blue-600" />
          <div>
            <h3 class="text-lg font-medium text-blue-900">Awaiting Approval</h3>
            <p class="text-blue-700">Submitted on {formatDate(submissionData.submittedAt)}</p>
          </div>
        </div>
        <a href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}><Button variant="outline" class="border-blue-500 text-blue-700 hover:bg-blue-700 hover:text-white ">
          <Mail class="mr-2 h-4 w-4" />
          Contact Support
        </Button></a>
      </div>

      <Separator />

      <!-- Status Steps -->
      <div class="space-y-4">
        <h3 class="font-medium text-lg">Verification Steps</h3>
        <div class="space-y-4">
          {#each submissionData.completedSteps as step}
            <div class="flex items-center gap-3">
              {#if step.completed}
                <CheckCircle class="h-6 w-6 text-green-500 flex-shrink-0" />
              {:else}
                <Clock class="h-6 w-6 text-amber-500 flex-shrink-0" />
              {/if}
              <div class="flex-1">
                <p class={step.completed ? "font-medium" : "text-muted-foreground"}>
                  {step.name}
                </p>
              </div>
              <span class="text-sm text-muted-foreground">
                {step.completed ? "Completed" : "Pending"}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <Separator />

      <!-- What's Next -->
      <div class="space-y-4">
        <h3 class="font-medium text-lg">What's Next?</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 class="font-medium flex items-center gap-2">
              <Mail class="h-5 w-5 text-blue-600" />
              Email Notifications
            </h4>
            <p class="text-sm text-muted-foreground">
              We'll email you when your application is approved or if we need additional information.
            </p>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 class="font-medium flex items-center gap-2">
              <AlertCircle class="h-5 w-5 text-amber-600" />
              Additional Information
            </h4>
            <p class="text-sm text-muted-foreground">
              We may contact you if we need additional documentation or clarification.
            </p>
          </div>
        </div>
      </div>
    </Card.Content>

    <Card.Footer class="flex flex-col space-y-2">
      <p class="text-sm text-center text-muted-foreground">
        Have questions? Contact us at {submissionData.contactEmail}
      </p>
      <div class="flex justify-center gap-4">
        <a href="/settings/edit-profile"><Button variant="outline">View My Profile</Button></a>
        <a href="/settings/documents"><Button variant="outline">Update Documents</Button></a>
      </div>
    </Card.Footer>
  </Card.Root>

  <!-- FAQ Section -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Frequently Asked Questions</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="space-y-2">
        <h4 class="font-medium">How long does the approval process take?</h4>
        <p class="text-sm text-muted-foreground">
          Typically, the approval process takes 2-3 business days. However, it may take longer depending on the volume of applications and the completeness of your submission.
        </p>
      </div>

      <Separator />

      <div class="space-y-2">
        <h4 class="font-medium">Can I make changes to my application while it's under review?</h4>
        <p class="text-sm text-muted-foreground">
          Yes, you can update your profile information and documents at any time. However, significant changes may reset the review process.
        </p>
      </div>

      <Separator />

      <div class="space-y-2">
        <h4 class="font-medium">What happens after my application is approved?</h4>
        <p class="text-sm text-muted-foreground">
          Once approved, you'll receive an email notification and gain full access to job listings. You can begin applying for positions immediately.
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</section>
