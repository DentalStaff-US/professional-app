<script lang="ts">
	import {
		Card,
		CardContent,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import {
		CalendarDays,
		Briefcase,
		Clock,
		Clipboard,
		ChevronRight,
		CalendarClock,
		FileText,
		Calendar,
		CalendarSearch,
		Building,
		CircleDollarSign,
		GraduationCap,
		MapPin,
		Tag
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { format, isPast } from 'date-fns';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { RecurrenceDayClaimSchema } from '$lib/config/zod-schemas';
	import { superForm } from 'sveltekit-superforms/client';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';
	import { formatInTimeZone } from 'date-fns-tz';

	// Render a YYYY-MM-DD as "Month d, yyyy" without applying any timezone shift.
	const formatUtcDate = (value: string | Date | null | undefined) => {
		if (!value) return '';
		const d = value instanceof Date ? value : new Date(value);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});
	};

	// Format a UTC timestamp in a given IANA timezone, falling back to the
	// requisition's referenceTimezone so the displayed time matches the admin app.
	const formatTimeInTz = (
		value: string | Date | null | undefined,
		timezone: string | null | undefined
	) => {
		if (!value) return '';
		const tz = timezone || 'America/New_York';
		try {
			return formatInTimeZone(value instanceof Date ? value : new Date(value), tz, 'p');
		} catch {
			return '';
		}
	};

	// Render a YYYY-MM-DD weekBeginDate as a 7-day "Mon d – Mon d, yyyy" range,
	// matching the admin app's pattern (start + 6 days, formatted in UTC).
	const formatWorkWeekRange = (weekBeginDate: string | null | undefined) => {
		if (!weekBeginDate) return '';
		const start = new Date(weekBeginDate);
		if (isNaN(start.getTime())) return '';
		const end = new Date(start);
		end.setUTCDate(start.getUTCDate() + 6);
		const fmt = (d: Date) =>
			d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
		return `${fmt(start)} – ${fmt(end)}, ${start.getUTCFullYear()}`;
	};

	// Mock data - replace with your actual data
	export let data: PageData;
	let dialogOpen: boolean = false;

	let selectedShift: any = null;
	$: user = data.user;
	$: workdays = data.workdays;
	$: timesheets = data.timesheets;
	$: requisitions = data.requisitions;

	// Get status badge variant
	function getStatusBadge(status) {
		switch (status.toLowerCase()) {
			case 'pending':
				return { variant: 'secondary', text: 'Pending' };
			case 'interview':
				return { variant: 'warning', text: 'Interview' };
			case 'offered':
				return { variant: 'success', text: 'Offered' };
			case 'rejected':
				return { variant: 'destructive', text: 'Rejected' };
			case 'confirmed':
				return { variant: 'success', text: 'Confirmed' };
			case 'pending submission':
				return { variant: 'warning', text: 'Submit Now' };
			case 'pending approval':
				return { variant: 'secondary', text: 'Awaiting Approval' };
			default:
				return { variant: 'secondary', text: status };
		}
	}

	$: console.log('Workdays:', workdays);

	const viewShiftDetails = (shift) => {
      selectedShift = shift;
      dialogOpen = true;
    };

	const closeDialog = () => {
      dialogOpen = false;
      selectedShift = null;
    };

	export let applyForm: SuperValidated<RecurrenceDayClaimSchema>;
	const { enhance, submitting } = superForm(applyForm, {
		onResult: ({ result }) => {
			console.log(result);
			if (result.type === 'success') {
				dialogOpen = false;
			}
		}
	});
</script>

<svelte:head>
	<title>Dashboard | DentalStaff.US</title>
</svelte:head>

<section class="container mx-auto px-4 space-y-8">
	<div class="flex flex-col gap-2">
		<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">Dashboard</h1>
		<p class="text-muted-foreground">
			Welcome back, {user?.firstName}
		</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Tabs for Shifts and Timesheets -->
			<Tabs value="requisitions" class="w-full">
				<TabsList class="grid w-full grid-cols-3 h-fit">
					<TabsTrigger value="requisitions" class="flex items-center gap-2 col-span-3 sm:col-span-1">
						<CalendarSearch class="h-4 w-4" />
						Available Shifts
					</TabsTrigger>
					<TabsTrigger value="shifts" class="flex items-center gap-2 col-span-3 sm:col-span-1">
						<CalendarClock class="h-4 w-4" />
						Upcoming Shifts
					</TabsTrigger>
					<TabsTrigger value="timesheets" class="flex items-center gap-2 col-span-3 sm:col-span-1">
						<Clipboard class="h-4 w-4" />
						Pending Timesheets
					</TabsTrigger>
				</TabsList>

				<!-- Requisitions Tab -->
				<TabsContent value="requisitions" class="pt-4">
					<Card>
						<CardContent class="p-0">
							{#if requisitions.length === 0}
								<div class="text-center py-6">
									<p class="text-muted-foreground">No available shifts</p>
								</div>
							{:else}
								<div class="divide-y">
									{#each requisitions as requisition}
										<div
											class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
										>
											<div class="space-y-1">
												<div class="font-medium">{requisition.requisition.disciplineName} <span class="text-xs text-gray-500">#{requisition.requisition.id}</span></div>
												<p class="text-sm text-muted-foreground">
													{requisition.company.name} • {requisition.location?.name || 'Location Not Provided'}
												</p>
												<div class="flex items-center gap-2 text-sm">
													<CalendarDays class="h-3.5 w-3.5 text-muted-foreground" />
													<span>{format(requisition.recurrenceDay.date, 'PP')}</span>
													<Clock class="h-3.5 w-3.5 ml-2 text-muted-foreground" />
													<span>{format(requisition.recurrenceDay.startTime, 'p')} - {format(requisition.recurrenceDay.endTime, 'p')}</span>
												</div>
											</div>
											<div class="flex items-center gap-2">
												<Badge variant="default">
													{requisition.recurrenceDay.status}
												</Badge>
												<Button on:click={() => viewShiftDetails(requisition)} variant="outline" size="sm">Details</Button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</CardContent>
						<CardFooter class="px-6 py-4 border-t">
							<Button href="/calendar" variant="ghost" size="sm" class="ml-auto gap-1">
								View Calendar <ChevronRight class="h-4 w-4" />
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>
				<!-- Shifts Tab -->
				<TabsContent value="shifts" class="pt-4">
					<Card>
						<CardContent class="p-0">
							{#if workdays.length === 0}
								<div class="text-center py-6">
									<p class="text-muted-foreground">No upcoming shifts</p>
								</div>
							{:else}
								<div class="divide-y">
									{#each workdays as shift}
										<div
											class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
										>
											<div class="space-y-1">
												<div class="font-medium">{shift.requisition.discipline} <span class="text-xs text-gray-500">#{shift.requisition.id}</span></div>
												<p class="text-sm text-muted-foreground">
													{shift.company.companyName} • {shift.location?.name || 'Location Not Provided'}
												</p>
												<div class="flex items-center gap-2 text-sm">
													<CalendarDays class="h-3.5 w-3.5 text-muted-foreground" />
													<span>{formatUtcDate(shift.recurrenceDay.date)}</span>
													<Clock class="h-3.5 w-3.5 ml-2 text-muted-foreground" />
													<span>
														{formatTimeInTz(shift.recurrenceDay.dayStart, shift.requisition.referenceTimezone)}
														- {formatTimeInTz(shift.recurrenceDay.dayEnd, shift.requisition.referenceTimezone)}
														<span class="text-xs text-muted-foreground"
															>({formatTimezoneName(
																shift.requisition.referenceTimezone || 'America/New_York'
															)})</span
														>
													</span>
												</div>
											</div>
											<div class="flex items-center gap-2">
												<Badge variant="default">
													{shift.recurrenceDay.status}
												</Badge>
												<Button href={`/my-shifts/${shift.workday.id}`} variant="outline" size="sm">Details</Button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</CardContent>
						<CardFooter class="px-6 py-4 border-t">
							<Button href="/calendar" variant="ghost" size="sm" class="ml-auto gap-1">
								View Calendar <ChevronRight class="h-4 w-4" />
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>

				<!-- Timesheets Tab -->
				<TabsContent value="timesheets" class="pt-4">
					<Card>
						<CardContent class="p-0">
							{#if timesheets.length === 0}
								<div class="text-center py-6">
									<p class="text-muted-foreground">No pending timesheets</p>
								</div>
							{:else}
								<div class="divide-y">
									{#each timesheets as timesheet}
										<div
											class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
										>
											<div class="space-y-1">
												<div class="font-medium">{timesheet.requisition.disciplineName}</div>
												<p class="text-sm text-muted-foreground">{timesheet.company.name}</p>
												<div class="flex items-center gap-2 text-sm">
													<CalendarDays class="h-3.5 w-3.5 text-muted-foreground" />
													<span>{formatWorkWeekRange(timesheet.timesheet.weekBeginDate)}</span>
													<Clock class="h-3.5 w-3.5 ml-2 text-muted-foreground" />
													<span>{timesheet.timesheet.totalHoursWorked} hours</span>
												</div>
											</div>
											<div class="flex items-center gap-2">
												<Badge variant="default">
													{getStatusBadge(timesheet.timesheet.status).text}
												</Badge>
												<Button
													href={`/timesheets/${timesheet.timesheet.id}`}
													variant="outline"
													size="sm"
												>
													View
												</Button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</CardContent>
						<CardFooter class="px-6 py-4 border-t">
							<Button href="/timesheets" variant="ghost" size="sm" class="ml-auto gap-1">
								View All Timesheets <ChevronRight class="h-4 w-4" />
							</Button>
						</CardFooter>
					</Card>
				</TabsContent>
			</Tabs>
			<!-- Job Applications Section -->
			<!-- <Card>
				<CardHeader class="pb-3">
					<div class="flex items-center justify-between">
						<CardTitle>Recent Applications</CardTitle>
						<Button variant="ghost" size="sm" class="gap-1">
							View All <ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{#if recentApplications.length === 0}
						<div class="text-center py-6">
							<p class="text-muted-foreground">No recent applications</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each recentApplications as application}
								<div
									class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
								>
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<span class="font-medium">{application.position}</span>
											<Badge
												variant={getJobTypeBadge(application.jobType).variant}
												class={getJobTypeBadge(application.jobType).class}
											>
												{application.jobType}
											</Badge>
										</div>
										<p class="text-sm text-muted-foreground">
											{application.company} • {application.location}
										</p>
										<p class="text-xs text-muted-foreground">
											Applied {formatDate(application.dateApplied)}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<Badge variant={getStatusBadge(application.status).variant}>
											{getStatusBadge(application.status).text}
										</Badge>
										<Button variant="outline" size="sm">View</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card> -->

			<!-- Messages Section -->
			<!-- <Card>
				<CardHeader class="pb-3">
					<div class="flex items-center justify-between">
						<CardTitle>Recent Messages</CardTitle>
						<Button variant="ghost" size="sm" class="gap-1">
							View Inbox <ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{#if unreadMessages.length === 0}
						<div class="text-center py-6">
							<p class="text-muted-foreground">No new messages</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each unreadMessages as message}
								<div class="flex items-start gap-4 pb-4 border-b">
									<div class="bg-blue-100 rounded-full p-2 mt-1">
										<MessageSquare class="h-4 w-4 text-blue-600" />
									</div>
									<div class="flex-1 space-y-1">
										<div class="flex items-center gap-2">
											<span class="font-medium">{message.from}</span>
											<Badge variant="secondary" class="text-xs font-normal">
												{message.company}
											</Badge>
											<span class="ml-auto text-xs text-muted-foreground">
												{formatDate(message.date)}
											</span>
										</div>
										<p class="font-medium text-sm">{message.subject}</p>
										<p class="text-sm text-muted-foreground line-clamp-1">
											{message.preview}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card> -->
		</div>

		<!-- Right Column -->
		<div class="space-y-6">
			<!-- Profile Completion -->
			<!-- <Card>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm font-medium">Your Profile</span>
                <span class="text-sm font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} class="h-2" />
            </div>

            <div class="space-y-4 pt-2">
              {#if !user?.completedOnboarding}
                <div class="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <h4 class="font-medium flex items-center gap-2 text-amber-800">
                    <AlertCircle class="h-4 w-4" />
                    Complete Your Profile
                  </h4>
                  <p class="text-sm text-amber-700 mt-1">
                    Improve your chances of getting hired by completing your profile.
                  </p>
                  <a href="/settings">
                      <Button size="sm" class="mt-3">Complete Now</Button>
                  </a>
                </div>
              {:else}
                <div class="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 class="font-medium flex items-center gap-2 text-green-800">
                    <CheckCircle2 class="h-4 w-4" />
                    Profile Complete
                  </h4>
                  <p class="text-sm text-green-700 mt-1">
                    Your profile is 100% complete and ready for employers.
                  </p>
                </div>
              {/if}

              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-green-500" />
                  <span class="text-sm">Personal Information</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-green-500" />
                  <span class="text-sm">Contact Details</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-green-500" />
                  <span class="text-sm">Professional Experience</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if profileCompletion > 60}
                    <CheckCircle2 class="h-4 w-4 text-green-500" />
                  {:else}
                    <AlertCircle class="h-4 w-4 text-amber-500" />
                  {/if}
                  <span class="text-sm">Resume Upload</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if profileCompletion > 80}
                    <CheckCircle2 class="h-4 w-4 text-green-500" />
                  {:else}
                    <AlertCircle class="h-4 w-4 text-amber-500" />
                  {/if}
                  <span class="text-sm">Required Documents</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card> -->

			<!-- Quick Links -->
			<Card>
				<CardHeader>
					<CardTitle>Quick Links</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					<div class="grid grid-cols-1 divide-y">
						<a href="/permanent">
							<Button
								variant="ghost"
								class="flex justify-start items-center h-12 px-6 py-8 rounded-none w-full hover:bg-gray-50"
							>
								<Briefcase class="h-5 w-5 mr-3 text-blue-600" />
								<span>Browse Permanent Jobs</span>
							</Button>
						</a>
						<a href="/settings/resume">
							<Button
								variant="ghost"
								class="flex justify-start items-center h-12 px-6 py-8 rounded-none w-full hover:bg-gray-50"
							>
								<FileText class="h-5 w-5 mr-3 text-blue-600" />
								<span>Update Resume</span>
							</Button>
						</a>
						<a href="/calendar">
							<Button
								variant="ghost"
								class="flex justify-start items-center h-12 px-6 py-8 rounded-none w-full hover:bg-gray-50"
							>
								<Calendar class="h-5 w-5 mr-3 text-blue-600" />
								<span>View Shift Calendar</span>
							</Button>
						</a>
						<a href="/timesheets/new">
							<Button
								variant="ghost"
								class="flex justify-start items-center h-12 px-6 py-8 rounded-none w-full hover:bg-gray-50"
							>
								<Clipboard class="h-5 w-5 mr-3 text-blue-600" />
								<span>Submit Timesheet</span>
							</Button>
						</a>
					</div>
				</CardContent>
			</Card>

			<!-- Job Search Stats -->
			<!-- <Card>
				<CardHeader>
					<CardTitle>Job Stats</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-sm">Total Applications</span>
							<span class="font-medium">12</span>
						</div>
						<Separator />
						<div class="flex justify-between items-center">
              <span class="text-sm">Interviews</span>
              <span class="font-medium">4</span>
            </div>
            <Separator />
						<div class="flex justify-between items-center">
              <span class="text-sm">Job Offers</span>
              <span class="font-medium">2</span>
            </div>
            <Separator />
						<div class="flex justify-between items-center">
							<span class="text-sm">Completed Shifts</span>
							<span class="font-medium">8</span>
						</div>
					</div>
				</CardContent>
			</Card> -->
		</div>
	</div>
</section>

<Dialog.Root open={dialogOpen} onOpenChange={() => (dialogOpen = !dialogOpen)}>
		<Dialog.Content class="max-w-xl overflow-auto h-full md:h-auto">
			<Dialog.Header>
				<Dialog.Title class="text-xl text-left font-bold">{selectedShift?.requisition.disciplineName}</Dialog.Title>
				<Dialog.Description>
					<div class="flex items-center gap-3 py-2">
						{#if selectedShift?.company.logo}
                           <img
                                   src={selectedShift?.company.logo}
                                   alt={`${selectedShift?.company.name} logo`}
                                   class="w-12 h-12 rounded-lg shadow-lg object-cover"
                           />
                       {:else}
                           <div class="h-12 w-12 flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg">
                               <Building class="h-8 w-8"/>
                           </div>
                       {/if}
						<div class="flex flex-col">
							<span class="font-medium">{selectedShift?.company.name}</span>
						</div>
					</div>
				</Dialog.Description>
			</Dialog.Header>


				<div class="space-y-6 py-4">
					<div class="space-y-3">
						<p class="font-semibold text-lg">Schedule Details</p>
						<div class="space-y-2">
							<div class="flex items-center gap-2 text-gray-600">
								<CalendarDays size={18} />
								<span
									>{selectedShift?.recurrenceDay?.date
										? new Date(selectedShift.recurrenceDay.date).toLocaleDateString('en-US', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												timeZone: 'UTC'
											})
										: ''}</span
								>
							</div>
							<div class="flex items-center gap-2 text-gray-600">
								<Clock size={18} />
								<span>
									{formatTimeInTz(
										selectedShift?.recurrenceDay.dayStart ?? selectedShift?.recurrenceDay.startTime,
										selectedShift?.requisition?.referenceTimezone
									)} - {formatTimeInTz(
										selectedShift?.recurrenceDay.dayEnd ?? selectedShift?.recurrenceDay.endTime,
										selectedShift?.requisition?.referenceTimezone
									)}
									<span class="text-xs"
										>({formatTimezoneName(
											selectedShift?.requisition?.referenceTimezone || 'America/New_York'
										)})</span
									>
								</span>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<p class="font-semibold text-lg">Position Details</p>
						<div class="space-y-3">
							<p class="font-semibold text-lg">Requirements</p>
							<div class="space-y-2">
								{#if selectedShift?.requisition.disciplineName}
									<div class="flex items-center gap-2 text-gray-600">
										<Briefcase size={18} />
										<span>{selectedShift?.requisition.disciplineName}</span>
									</div>
								{/if}
								<div class="flex items-center gap-2 text-gray-600">
									<GraduationCap size={18} />
									<span>{selectedShift?.requisition.experienceLevelName ?? 'No Preference'}</span>
								</div>
							</div>
</div>
						<div class="grid grid-cols-2 gap-4">
							<div class="flex items-center gap-2 text-gray-600">
								<CircleDollarSign size={18} />
								<span>${selectedShift?.requisition.hourlyRate}/hr</span>
							</div>
							<div class="flex items-center gap-2 text-gray-600">
								<Tag size={18} />
								<Badge
									variant={selectedShift?.recurrenceDay.status === 'OPEN'
										? 'default'
										: 'secondary'}
								>
									{selectedShift?.recurrenceDay.status}
								</Badge>
							</div>
						</div>
					</div>

					{#if selectedShift?.location}
						<div class="space-y-3">
							<p class="font-semibold text-lg">Location</p>
							<div class="flex items-center gap-2 text-gray-600">
								<MapPin size={18} />
								<div>
									<p>
										{selectedShift?.location.name}
									</p>
									<p class="text-sm text-gray-600">
										{selectedShift?.location.completeAddress}
									</p>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<Dialog.Footer class="flex gap-2 justify-end">
					<Button variant="outline" type="button" on:click={() => (dialogOpen = false)}>
						Close
					</Button>
					{#if !isPast(new Date(selectedShift?.recurrenceDay.startTime)) && selectedShift?.recurrenceDay.status === 'OPEN'}
						<form method="POST" action="?/claimWorkdayShift" use:enhance>
							<input
								type="hidden"
								name="recurrenceDayId"
								value={selectedShift?.recurrenceDay.id}
							/>
							<Button
								class="bg-blue-800 hover:bg-blue-900 w-full md:w-fit"
								type="submit"
								disabled={selectedShift?.recurrenceDay.status !== 'OPEN' ||
									$submitting }
							>
								{#if $submitting}
									Claiming...
								{:else}
									{selectedShift?.recurrenceDay.status === 'OPEN' && 'Claim Shift'}
								{/if}
							</Button>
						</form>
					{/if}
				</Dialog.Footer>

		</Dialog.Content>
	</Dialog.Root>
