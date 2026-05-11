<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		CalendarDays,
		Clock,
		MapPin,
		Building,
		FileText,
		DollarSign,
		Phone,
		Mail,
		ArrowLeft,
		CheckCircle2,
		X,
		AlertCircle,
		Clipboard,
		Calendar,
		Info,
		User
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { differenceInMinutes } from 'date-fns/fp';
	import { format } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';
	import { enhance } from '$app/forms';

	export let data: PageData;

	// Requisition timezone is the source of truth for shift times (matches admin app).
	const requisitionTimezone = data.workday?.requisition?.referenceTimezone || 'America/New_York';
	const requisitionTimezoneLabel = formatTimezoneName(requisitionTimezone);

	// For demonstration purposes - in a real app, this would be controlled by the actual shift date
	// compared to current date, and the status of the shift
	const isUpcoming = new Date(data.workday?.recurrenceDay?.dayStart) > new Date();
	const isPast = !isUpcoming;
	// const canSubmitTimesheet = isPast && (!timesheet || timesheet.status === 'draft');
	// Admin/client cancellations leave the workday in place with a
	// `cancelledAt` flag and the recurrence day flipped to CANCELED. Hide the
	// candidate's "Relinquish Shift" button in either of those states so they
	// can't accidentally write a CANDIDATE cancellation row against a shift
	// that's already been killed by the other side — that would skew the
	// penalty-tracking data.
	const isCancelled =
		data.workday.recurrenceDay.status === 'CANCELED' || Boolean(data.workday.cancelledAt);
	const canCancelShift =
		isUpcoming && data.workday.recurrenceDay.status === 'FILLED' && !data.workday.cancelledAt;

	// UI state
	let isCancelDialogOpen = false;
	let isSubmitting = false;

	// Get status badge
	function getStatusBadge(status) {
		switch (status) {
			case 'confirmed':
				return { variant: 'success', text: 'Confirmed', icon: CheckCircle2 };
			case 'pending':
				return { variant: 'warning', text: 'Pending', icon: Clock };
			case 'completed':
				return { variant: 'secondary', text: 'Completed', icon: CheckCircle2 };
			case 'canceled':
				return { variant: 'destructive', text: 'Canceled', icon: X };
			case 'no_show':
				return { variant: 'destructive', text: 'No Show', icon: X };
			default:
				return { variant: 'default', text: status, icon: Info };
		}
	}

	// Get timesheet status badge
	function getTimesheetBadge(status) {
		if (!status) return { variant: 'default', text: 'Not Submitted', icon: AlertCircle };

		switch (status) {
			case 'draft':
				return { variant: 'secondary', text: 'Draft', icon: FileText };
			case 'pending':
				return { variant: 'warning', text: 'Pending Approval', icon: Clock };
			case 'approved':
				return { variant: 'success', text: 'Approved', icon: CheckCircle2 };
			case 'rejected':
				return { variant: 'destructive', text: 'Rejected', icon: X };
			default:
				return { variant: 'default', text: status, icon: Info };
		}
	}

	// Calculate hours worked
	function calculateHoursWorked(start, end, breakMinutes) {
		const [startHour, startMinute] = start.split(':').map(Number);
		const [endHour, endMinute] = end.split(':').map(Number);

		const startMinutes = startHour * 60 + startMinute;
		const endMinutes = endHour * 60 + endMinute;

		const totalMinutes = endMinutes - startMinutes - breakMinutes;
		return Math.max(0, totalMinutes / 60);
	}
	const statusBadge = getStatusBadge(data.workday?.recurrenceDay?.status);
	// const timesheetBadge = timesheet ? getTimesheetBadge(timesheet.status) : getTimesheetBadge(null);
</script>

<svelte:head>
	<title>Shift Details | DentalStaff.US</title>
</svelte:head>

<section class="container mx-auto px-4 py-6 space-y-6">
	<!-- Back button and status indicator -->

	<Button variant="ghost" class="w-fit gap-2" href="/my-shifts">
		<ArrowLeft class="h-4 w-4" />
		<span>Back to Shifts</span>
	</Button>

	{#if isCancelled}
		<div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			<p class="font-semibold">This shift was cancelled.</p>
			<p>The position is no longer happening — you do not need to show up.</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="md:col-span-2 space-y-6">
			<!-- Shift Details Card -->
			<Card>
				<CardHeader>
					<CardTitle class="text-2xl">{data.workday.requisition.disciplineName} <span class="text-xs text-muted-foreground"> - Req# ${data.workday.requisition.id}</span></CardTitle>
					<CardDescription>{data.workday.requisition.companyName}</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Date and Time -->
					<div class="flex items-start gap-4">
						<div class="bg-blue-100 rounded-full p-2.5">
							<CalendarDays class="h-5 w-5 text-blue-700" />
						</div>
						<div>
							<h3 class="font-medium">Date & Time</h3>
							<p class="text-muted-foreground">
								{new Date(data.workday.recurrenceDay.date).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric',
									timeZone: 'UTC'
								})}
							</p>
							<p class="text-muted-foreground">
								{formatInTimeZone(data.workday.recurrenceDay.dayStart, requisitionTimezone, 'hh:mm a')}
								- {formatInTimeZone(data.workday.recurrenceDay.dayEnd, requisitionTimezone, 'hh:mm a')}
								<span class="text-xs">({requisitionTimezoneLabel} time)</span>
							</p>
						</div>
					</div>

					<!-- Location -->
					<div class="flex items-start gap-4">
						<div class="bg-blue-100 rounded-full p-2.5">
							<MapPin class="h-5 w-5 text-blue-700" />
						</div>
						<div>
							<h3 class="font-medium">{data.workday.location.name}</h3>
							<p class="text-muted-foreground">
								{data.workday.location.completeAddress}
							</p>
						</div>
					</div>

					<!-- Pay Rate -->
					<div class="flex items-start gap-4">
						<div class="bg-blue-100 rounded-full p-2.5">
							<DollarSign class="h-5 w-5 text-blue-700" />
						</div>
						<div>
							<h3 class="font-medium">Hourly Rate</h3>
							<p class="text-muted-foreground">
								${data.workday.requisition.hourlyRate.toFixed(2)} per hour
							</p>
						</div>
					</div>

					<Separator />

					<!-- Description -->
					<div>
						<h3 class="font-medium mb-2">Job Description</h3>
						<p class="text-muted-foreground whitespace-pre-wrap">
							{data.workday.requisition.jobDescription}
						</p>
					</div>

					<!-- Notes -->
					{#if data.workday.requisition.specialInstructions}
						<Alert>
							<Info class="h-4 w-4" />
							<AlertTitle>Important Notes</AlertTitle>
							<AlertDescription class="whitespace-pre-wrap"
								>{data.workday.requisition.specialInstructions}</AlertDescription
							>
						</Alert>
					{/if}
				</CardContent>

				<!-- Action buttons for upcoming shifts -->
				{#if isUpcoming}
					<CardFooter class="flex flex-wrap gap-3 border-t pt-6">
						<!-- <Button variant="outline" class="gap-2">
							<Calendar class="h-4 w-4" />
							<span>Add to Calendar</span>
						</Button> -->

						{#if canCancelShift}
							<Button
								variant="outline"
								class="gap-2 border-red-200 text-red-700 hover:bg-red-50"
								on:click={() => (isCancelDialogOpen = true)}
							>
								<X class="h-4 w-4" />
								<span>Relinquish Shift</span>
							</Button>
						{/if}
					</CardFooter>
				{/if}
			</Card>

			<!-- Timesheet Section -->
			<!-- {#if isPast || timesheet}
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>Timesheet</CardTitle>
              {#if timesheet}
                <Badge variant={timesheetBadge.variant}>
                  <svelte:component this={timesheetBadge.icon} class="h-3 w-3 mr-1" />
                  {timesheetBadge.text}
                </Badge>
              {/if}
            </div>
            <CardDescription>
              {#if !timesheet}
                Submit your hours worked for this shift
              {:else if timesheet.status === 'draft'}
                Complete and submit your timesheet
              {:else if timesheet.status === 'pending'}
                Your timesheet is being reviewed
              {:else if timesheet.status === 'approved'}
                Your timesheet has been approved
              {:else if timesheet.status === 'rejected'}
                Your timesheet needs revision
              {/if}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {#if canSubmitTimesheet}
              <form class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      bind:value={timesheetStartTime}
                    />
                  </div>

                  <div class="space-y-2">
                    <Label for="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      bind:value={timesheetEndTime}
                    />
                  </div>
                </div>

                <div class="space-y-2">
                  <Label for="break-time">Break Time (minutes)</Label>
                  <Input
                    id="break-time"
                    type="number"
                    bind:value={timesheetBreak}
                    min="0"
                    step="15"
                  />
                </div>

                <div class="space-y-2">
                  <Label for="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    bind:value={timesheetNotes}
                    placeholder="Add any notes about your shift"
                    rows={3}
                  />
                </div>

                <div class="bg-muted p-4 rounded-md">
                  <div class="flex justify-between mb-2">
                    <span>Hours Worked:</span>
                    <span class="font-medium">
                      {calculateHoursWorked(timesheetStartTime, timesheetEndTime, timesheetBreak).toFixed(2)} hours
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>Estimated Earnings:</span>
                    <span class="font-medium">
                      ${(calculateHoursWorked(timesheetStartTime, timesheetEndTime, timesheetBreak) * shift.hourlyRate).toFixed(2)}
                    </span>
                  </div>
                </div>
              </form>

              <div class="mt-6 flex justify-end">
                <Button
                  on:click={handleTimesheetSubmit}
                  disabled={isSubmitting}
                >
                  {#if isSubmitting}
                    <span class="animate-spin mr-2">⟳</span>
                    Submitting...
                  {:else}
                    Submit Timesheet
                  {/if}
                </Button>
              </div>
            {:else if timesheet}
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-muted-foreground">Date Submitted</p>
                    <p class="font-medium">
                      {new Date(timesheet.dateSubmitted).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <div>
                    <p class="text-sm text-muted-foreground">Work Hours</p>
                    <p class="font-medium">{formatTimeRange(timesheet.startTime, timesheet.endTime)}</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-muted-foreground">Break Time</p>
                    <p class="font-medium">{(timesheet.breakTime / 60).toFixed(1)} hours</p>
                  </div>

                  <div>
                    <p class="text-sm text-muted-foreground">Total Hours</p>
                    <p class="font-medium">{timesheet.hoursWorked.toFixed(2)} hours</p>
                  </div>
                </div>

                {#if timesheet.notes}
                  <div>
                    <p class="text-sm text-muted-foreground">Notes</p>
                    <p class="bg-muted p-3 rounded-md mt-1">{timesheet.notes}</p>
                  </div>
                {/if}

                <div class="bg-blue-50 p-4 rounded-md text-blue-700">
                  <div class="flex justify-between mb-2">
                    <span class="font-medium">Hourly Rate:</span>
                    <span>${shift.hourlyRate.toFixed(2)}/hr</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="font-medium">Total Earnings:</span>
                    <span>${timesheet.earnings.toFixed(2)}</span>
                  </div>
                </div>

                {#if timesheet.status === 'rejected' && timesheet.feedback}
                  <Alert variant="destructive">
                    <AlertCircle class="h-4 w-4" />
                    <AlertTitle>Revision Required</AlertTitle>
                    <AlertDescription>{timesheet.feedback}</AlertDescription>
                  </Alert>
                {/if}
              </div>

              {#if timesheet.status === 'rejected'}
                <div class="mt-6 flex justify-end">
                  <Button>Edit Timesheet</Button>
                </div>
              {/if}
            {:else}
              <div class="text-center py-6">
                <Clipboard class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 class="text-lg font-medium mb-1">No Timesheet Available</h3>
                <p class="text-muted-foreground">
                  {#if shift.status === 'canceled'}
                    This shift was canceled.
                  {:else if shift.status === 'no_show'}
                    You were marked as a no-show for this shift.
                  {:else}
                    You'll be able to submit a timesheet after completing this shift.
                  {/if}
                </p>
              </div>
            {/if}
          </CardContent>
        </Card>
      {/if} -->
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Client Information -->
			<Card>
				<CardHeader>
					<CardTitle>Client Contact</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-start gap-3">
						<Phone class="h-5 w-5 text-muted-foreground mt-0.5" />
						<div>
							<a href={`tel:${data.workday.location.companyPhone}`} class="font-medium"
								>{data.workday.location.companyPhone || 'None Provided'}</a
							>
							<p class="text-sm text-muted-foreground">Phone</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<Mail class="h-5 w-5 text-muted-foreground mt-0.5" />
						<div>
							<p class="font-medium">{data.workday.location.email}</p>
							<p class="text-sm text-muted-foreground">Email</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Support Information -->
			<Card>
				<CardHeader>
					<CardTitle>Need Help?</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<p class="text-sm text-muted-foreground">
						If you have any questions or issues with this shift, our support team is here to help.
					</p>

					<div class="space-y-2">
						<Button variant="outline" class="w-full gap-2">
							<Phone class="h-4 w-4" />
							<span>Call Support</span>
						</Button>

						<Button variant="outline" class="w-full gap-2">
							<Mail class="h-4 w-4" />
							<span>Email Support</span>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<!-- Cancel Shift Dialog -->
<Dialog bind:open={isCancelDialogOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Cancel Shift</DialogTitle>
			<DialogDescription>
				Are you sure you want to cancel this shift? This action cannot be undone.
			</DialogDescription>
		</DialogHeader>

		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertTitle>Important</AlertTitle>
			<AlertDescription>
				Cancellations within 24 hours of the shift may affect your profile rating.
			</AlertDescription>
		</Alert>

		<DialogFooter>
			<form use:enhance method="POST" action="?/cancelWorkdayShift">
				<input type="hidden" name="workdayId" value={data.workday.workday.id} />
				<Button
					type="button"
					variant="outline"
					on:click={() => (isCancelDialogOpen = false)}
					disabled={isSubmitting}
				>
					Keep Shift
				</Button>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}
						<span class="animate-spin mr-2">⟳</span>
						Cancelling...
					{:else}
						Confirm Cancellation
					{/if}
				</Button>
			</form>
		</DialogFooter>
	</DialogContent>
</Dialog>
