<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { StatusBadge } from '$lib/components/ui/status-badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		CalendarDays,
		Clock,
		Building,
		DollarSign,
		ArrowLeft,
		CheckCircle2,
		X,
		AlertCircle,
		Calendar,
		Info,
		Download,
		Printer,
		Clipboard,
		AlertTriangle,
		XCircle,
		Edit,
		Save,
		Plus,
		Receipt,
		Trash2,
		Loader2
	} from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';
	import {
		format,
		parseISO,
		isValid,
		addDays,
		eachDayOfInterval,
		startOfWeek,
		endOfWeek
	} from 'date-fns';
	import { cn } from '$lib/utils';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
	import { formatTimezoneName } from '$lib/_helpers/UTCTimezoneUtils';

	export let data: PageData;

	let cancelDialogOpen = false;
	let verifyDialogOpen = false;
	let submitDialogOpen = false;
	let isEditing = false;
	let initialLoadDone = false;
 let dataLoaded = false;

  // ✅ Track when data is ready
  $: {
    if (requisition?.referenceTimezone && data.workdays) {
      dataLoaded = true;
    }
  }
	$: timesheet = data.timesheet;
	$: requisition = data.requisition;
	$: company = data.company;
	$: recurrenceDay = data.recurrenceDay;
	$: workday = data.workday;
	$: expenses = (data.expenses ?? []) as Array<{
		id: string;
		description: string;
		amountCents: number;
		status: 'PENDING' | 'APPROVED' | 'REJECTED';
		rejectionReason: string | null;
	}>;
	$: canAddExpenses =
		timesheet?.status === 'DRAFT' ||
		timesheet?.status === 'PENDING' ||
		timesheet?.status === 'DISCREPANCY';

	const addExpenseSF = superForm(data.addExpenseForm, {
		resetForm: true,
		taintedMessage: null
	});
	const {
		enhance: addExpenseEnhance,
		form: addExpenseFormData,
		submitting: addExpenseSubmitting
	} = addExpenseSF;

	$: console.log(requisition)
	// ✅ Initialize time entries from existing timesheet or create empty ones.
	// Each entry carries its own workdayId (looked up by date from data.workdays)
	// so submission sends the correct workday per day — required by the API and
	// avoids the "Workday ID is required" error when the timesheet has no single
	// linked workday.
	let timeEntries: Record<string, { startTime: string; endTime: string; hours: number; workdayId: string; lunchStartTime?: string; lunchEndTime?: string }> = {};

	// date (YYYY-MM-DD) → workday.id, from the per-day workdays list.
	$: workdayIdByDate = Object.fromEntries(
		(data.workdays ?? [])
			.filter((wd: any) => wd?.recurrenceDay?.date && wd?.workday?.id)
			.map((wd: any) => [wd.recurrenceDay.date, wd.workday.id])
	) as Record<string, string>;

	// Match admin app: weekBeginDate is a YYYY-MM-DD string with no time.
	// Compute end as start + 6 days using UTC math, format with timeZone: 'UTC'
	// so the displayed range is stable regardless of the viewer's locale/timezone.
	// See dental-staff-app/src/routes/(protected)/timesheets/+page.svelte
	$: formattedWeekRange = (() => {
		if (!timesheet?.weekBeginDate) return 'Invalid date range';
		const start = new Date(timesheet.weekBeginDate);
		if (!isValid(start)) return 'Invalid date range';
		const end = new Date(start);
		end.setUTCDate(start.getUTCDate() + 6);
		const fmt = (d: Date) =>
			d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
		return `${fmt(start)} – ${fmt(end)}, ${start.getUTCFullYear()}`;
	})();

	$: workdayDates = data.workdays
		? data.workdays.map((wd: any) => wd.recurrenceDay.date)
		: [recurrenceDay?.date].filter(Boolean);

	// Recurrence day `date` is a YYYY-MM-DD (date-only). Format in UTC so the
	// displayed day matches what's stored, regardless of viewer timezone.
	$: scheduledWorkDays = workdayDates
		.map((dateStr: string) => {
			const date = new Date(dateStr);
			return {
				date,
				dateKey: dateStr,
				dayString: isValid(date)
					? formatInTimeZone(date, 'UTC', 'EEE, MMM d')
					: dateStr
			};
		})
		.sort((a, b) => a.date.getTime() - b.date.getTime());

	// Display label for the requisition timezone (e.g. "America/New_York" → "New York")
	$: requisitionTimezone = requisition?.referenceTimezone || 'America/New_York';
	$: requisitionTimezoneLabel = formatTimezoneName(requisitionTimezone);

	// ✅ Initialize entries for all scheduled workdays
	$: {
    if (scheduledWorkDays.length > 0 && !initialLoadDone) {
      scheduledWorkDays.forEach(({ dateKey }) => {
        if (!timeEntries[dateKey]) {
          timeEntries[dateKey] = {
            startTime: '',
            endTime: '',
            lunchStartTime: '',
            lunchEndTime: '',
            hours: 0,
            workdayId: workdayIdByDate[dateKey] ?? ''
          };
        } else if (!timeEntries[dateKey].workdayId) {
          // Backfill the workdayId onto an entry that was created from hoursRaw.
          timeEntries[dateKey].workdayId = workdayIdByDate[dateKey] ?? '';
        }
      });
    }
  }

	function hasLatestShiftEnded(): boolean {
    // Wait for data to be loaded
    if (!dataLoaded) {
      return false; // Disable submit until data loads
    }


    if (!data.workdays || data.workdays.length === 0) {
      return true;
    }

    if (!requisition?.referenceTimezone) {
      return true;
    }

    // Sort workdays by date to find the latest one
    const sortedWorkdays = [...data.workdays].sort((a, b) => {
      const dateA = new Date(a.recurrenceDay.date);
      const dateB = new Date(b.recurrenceDay.date);
      return dateA.getTime() - dateB.getTime();
    });

    const latestWorkday = sortedWorkdays[sortedWorkdays.length - 1];

    if (!latestWorkday?.recurrenceDay?.dayEnd) {
      return true;
    }

    try {
      // Get current time
      const now = new Date();
      console.log('Current time (UTC):', now.toISOString());

      const nowInReqZone = toZonedTime(now, requisition.referenceTimezone);
      console.log('Current time in requisition zone:', nowInReqZone.toISOString());

      // Parse the shift end time
      const shiftEndTime = new Date(latestWorkday.recurrenceDay.dayEnd);
      console.log('Shift end time (UTC):', shiftEndTime.toISOString());
      console.log('Shift date:', latestWorkday.recurrenceDay.date);

      const shiftEndInReqZone = toZonedTime(shiftEndTime, requisition.referenceTimezone);
      console.log('Shift end time in requisition zone:', shiftEndInReqZone.toISOString());

      const hasEnded = nowInReqZone >= shiftEndInReqZone;
      console.log('Has shift ended?', hasEnded);
      console.log('=== End check ===');

      return hasEnded;
    } catch (error) {
      console.error('Error checking shift end time:', error);
      return true;
    }
  }

	// ✅ Function to load time entries
	function loadTimeEntries() {
    scheduledWorkDays.forEach(({ dateKey }) => {
      timeEntries[dateKey] = {
        startTime: '',
        endTime: '',
        lunchStartTime: '',
        lunchEndTime: '',
        hours: 0,
        workdayId: workdayIdByDate[dateKey] ?? ''
      };
    });

    if (timesheet?.hoursRaw && Array.isArray(timesheet.hoursRaw) && timesheet.hoursRaw.length > 0) {
      // Convert UTC timestamps into the requisition's timezone so the
      // pre-filled inputs display times the way they were entered (matches
      // admin app pattern — requisition.referenceTimezone is the source of truth).
      const tz = requisitionTimezone;
      const toTzTime = (iso: string | null | undefined) =>
        iso ? formatInTimeZone(new Date(iso), tz, 'HH:mm') : '';

      timesheet.hoursRaw.forEach((entry: any) => {
        const dateKey = entry.date;

        const startTime = toTzTime(entry.startTime);
        const endTime = toTzTime(entry.endTime);
        const lunchStartTime = toTzTime(entry.lunchStartTime);
        const lunchEndTime = toTzTime(entry.lunchEndTime);

        if (timeEntries[dateKey]) {
          timeEntries[dateKey] = {
            startTime,
            endTime,
            lunchStartTime,
            lunchEndTime,
            hours: entry.hours || 0,  // This already has lunch deducted
            workdayId: workdayIdByDate[dateKey] ?? timeEntries[dateKey].workdayId ?? ''
          };
        }
      });
    }

    timeEntries = { ...timeEntries };
  }

  function calculateLunchHours(lunchStart: string, lunchEnd: string): number {
    if (!lunchStart || !lunchEnd) return 0;
    const [startHour, startMin] = lunchStart.split(':').map(Number);
    const [endHour, endMin] = lunchEnd.split(':').map(Number);
    const hours = endHour - startHour + (endMin - startMin) / 60;
    return Math.max(0, Math.round(hours * 100) / 100);
  }

  function calculateHours(
    startTime: string,
    endTime: string,
    lunchStart: string = '',
    lunchEnd: string = ''
  ): number {
    if (!startTime || !endTime) return 0;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const totalTime = endHour - startHour + (endMin - startMin) / 60;

    const lunchHours = calculateLunchHours(lunchStart, lunchEnd);
    const hoursWorked = totalTime - lunchHours;

    return Math.round(hoursWorked * 100) / 100;
  }

	// ✅ Only load once on mount
	onMount(() => {
		loadTimeEntries();
		initialLoadDone = true;
	});

	// ✅ Calculate total hours
	$: totalHours = Object.values(timeEntries).reduce((sum, entry) => sum + (entry.hours || 0), 0);

	// Overtime is per-WEEK (>40h). When a week is split across timesheets, some
	// of the week's 40h regular allotment may already be used on another approved
	// timesheet (priorWeekHours from the API), so this sheet's hours can be all
	// overtime even though it's under 40 on its own.
	$: priorWeekHours = Number((timesheet as any)?.priorWeekHours ?? 0);
	$: regularHoursDisplay = Math.min(totalHours, Math.max(0, 40 - priorWeekHours));
	$: overtimeHoursDisplay = Math.max(0, totalHours - regularHoursDisplay);

	// ✅ Check if form is valid
  $: hasHoursEntered = Object.values(timeEntries).some((entry) => entry.hours > 0);
  $: latestShiftEnded = dataLoaded ? hasLatestShiftEnded() : false;
  $: canSubmit = hasHoursEntered && totalHours > 0 && latestShiftEnded;

  $: isDraft = timesheet?.status === 'DRAFT';
  $: isPending = timesheet?.status === 'PENDING';
  $: isDiscrepancy = timesheet?.status === 'DISCREPANCY';
  $: isApproved = timesheet?.status === 'APPROVED';
  $: isVoid = timesheet?.status === 'VOID';
  $: isRejected = timesheet?.status === 'REJECTED';

  // Candidates only edit DRAFT timesheets. DISCREPANCY hand-off is admin-driven —
  // the candidate sees the status but does not get an Edit button. (Previously
  // candidates could re-enter DISCREPANCY via an Edit button; that capability
  // moved to the admin app.)
  $: canEdit = isDraft;

  // Per-row gate: a workday's inputs only become editable after that shift has
  // ended. The candidate can amend the day's hours each evening; rows for
  // future shifts stay locked. Build a date→dayEnd map from data.workdays
  // (the recurrence day's dayEnd is a UTC timestamp; comparing two Dates is
  // timezone-agnostic).
  $: shiftEndByDate = (data.workdays ?? []).reduce(
    (acc: Record<string, string>, wd: any) => {
      const date = wd?.recurrenceDay?.date;
      const end = wd?.recurrenceDay?.dayEnd;
      if (date && end) acc[date] = end;
      return acc;
    },
    {}
  );
  const isShiftOver = (dateKey: string): boolean => {
    const end = shiftEndByDate[dateKey];
    if (!end) return false;
    return new Date() > new Date(end);
  };

  // Save-draft is available whenever the timesheet is editable. Unlike Submit,
  // it has no "last shift ended" requirement — the candidate can save partial
  // hours each evening as their shifts end and come back later for the rest.
  $: canSaveDraft = canEdit;

  function updateTimeEntry(
    dateKey: string,
    field: 'startTime' | 'endTime' | 'lunchStartTime' | 'lunchEndTime',
    value: string
  ) {
    if (!timeEntries[dateKey]) {
      timeEntries[dateKey] = {
        startTime: '',
        endTime: '',
        lunchStartTime: '',
        lunchEndTime: '',
        hours: 0,
        workdayId: workdayIdByDate[dateKey] ?? ''
      };
    }

    timeEntries[dateKey][field] = value;

    // Calculate hours worked (excluding lunch)
    timeEntries[dateKey].hours = calculateHours(
      timeEntries[dateKey].startTime,
      timeEntries[dateKey].endTime,
      timeEntries[dateKey].lunchStartTime,
      timeEntries[dateKey].lunchEndTime
    );

    // Force reactivity
    timeEntries = { ...timeEntries };
  }

	function enableEditing() {
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		loadTimeEntries();
	}

	// Render a UTC timestamp (entry.startTime, etc.) in the requisition's
	// timezone — admin app uses formatInTimeZone(value, requisition.referenceTimezone, ...)
	function safeFormatDate(date: any, formatStr: string = 'hh:mm a'): string {
		if (!date) return 'N/A';

		try {
			const parsedDate = typeof date === 'string' ? new Date(date) : date;
			if (!isValid(parsedDate)) {
				return 'N/A';
			}
			return formatInTimeZone(parsedDate, requisitionTimezone, formatStr);
		} catch (error) {
			console.error('Error formatting date:', error, date);
			return 'N/A';
		}
	}

	// Recurrence-day / hours-raw `date` is a YYYY-MM-DD with no time. Render
	// in UTC so the displayed weekday matches the stored date for every viewer.
	function formatFullDate(dateString: string) {
		if (!dateString) return 'N/A';

		try {
			const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

			if (!isValid(date)) {
				console.error('Invalid date:', dateString);
				return 'Invalid Date';
			}

			return date.toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'UTC'
			});
		} catch (error) {
			console.error('Error formatting date:', error, dateString);
			return 'Date Error';
		}
	}

	function getTimesheetStatusBadge(status: string) {
		const badges: Record<string, { text: string; icon: any; class: string }> = {
			DRAFT: { text: 'DRAFT', icon: Edit, class: 'bg-gray-300 hover:bg-gray-400' },
			PENDING: { text: 'PENDING', icon: AlertCircle, class: 'bg-yellow-300 hover:bg-yellow-400' },
			DISCREPANCY: {
				text: 'DISCREPANCY',
				icon: AlertTriangle,
				class: 'bg-orange-400 hover:bg-orange-500'
			},
			APPROVED: { text: 'APPROVED', icon: CheckCircle2, class: 'bg-green-400 hover:bg-success/90' },
			VOID: { text: 'VOID', icon: X, class: 'bg-gray-200 hover:bg-gray-300' },
			REJECTED: { text: 'REJECTED', icon: XCircle, class: 'bg-destructive hover:bg-destructive/90' }
		};

		return badges[status] || badges.DRAFT;
	}

	$: statusBadge = getTimesheetStatusBadge(timesheet?.status || 'DRAFT');
</script>

<svelte:head>
	<title>Timesheet Details | DTSS</title>
</svelte:head>

<section class="container mx-auto px-4 py-6 space-y-6">
	<!-- Back button and actions -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<Button variant="ghost" class="w-fit gap-2" href="/timesheets">
			<ArrowLeft class="h-4 w-4" />
			<span>Back to Timesheets</span>
		</Button>

		{#if !isDraft}
			<div class="flex gap-2">
				<Button variant="outline" size="sm" class="gap-1">
					<Printer class="w-4 h-4" />
					<span class="hidden sm:inline">Print</span>
				</Button>
				<Button variant="outline" size="sm" class="gap-1">
					<Download class="w-4 h-4" />
					<span class="hidden sm:inline">Download</span>
				</Button>
			</div>
		{/if}
	</div>

	<!-- Timesheet Header -->
	<div>
		<div class="flex flex-wrap items-center gap-3">
			<h1 class="text-2xl font-bold">Timesheet</h1>
			<StatusBadge status={timesheet?.status} />

		</div>
		<p class="text-muted-foreground flex items-center mt-1">
			<Calendar class="h-4 w-4 mr-1" />
			Week of {formattedWeekRange}
			<span class="ml-2 text-xs">({requisitionTimezoneLabel} time)</span>
		</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="md:col-span-2 space-y-6">
			<!-- Company and Position Info -->
			<Card>
				<CardHeader>
					<CardTitle>{requisition?.disciplineName || 'Work Assignment'}</CardTitle>
					<CardDescription>{company?.name || 'Company'}</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Payment Information -->
					<div class="flex items-start gap-4">
						<div class="bg-blue-100 rounded-full p-2.5">
							<DollarSign class="h-5 w-5 text-blue-700" />
						</div>
						<div>
							<h3 class="font-medium">Pay Information</h3>
							<p class="text-muted-foreground">Base Rate: ${requisition?.hourlyRate || 0}/hr</p>
						</div>
					</div>

					<Separator />

					<!-- Total Hours Summary -->
					<div>
                        <h3 class="font-medium mb-3">Hours Summary</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                            <div class="p-3 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-600">Total Hours</p>
                                <p class="text-xl font-bold">{totalHours.toFixed(2)}</p>
                            </div>
                            <div class="p-3 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-600">Regular Hours</p>
                                <p class="text-xl font-bold">{regularHoursDisplay.toFixed(2)}</p>
                            </div>
                            <div class="p-3 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-600">Overtime</p>
                                <p class="text-xl font-bold">{overtimeHoursDisplay.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {#if isDiscrepancy}
                          <Separator />

                          <Alert variant="destructive">
                            <AlertTriangle class="h-4 w-4" />
                            <AlertTitle>
                              Timesheet Discrepancy
                            </AlertTitle>
                            <AlertDescription class="mt-2">
                              <p class="text-sm font-medium mb-1">Reason:</p>
                              <p class="text-sm whitespace-pre-wrap">{timesheet.discrepancyNote || "No notes provided"}</p>
                              {#if isDiscrepancy}
                                <p class="text-sm mt-2 font-medium">
                                  Please correct your hours below and resubmit.
                                </p>
                              {/if}
                            </AlertDescription>
                          </Alert>
                        {/if}
				</CardContent>
			</Card>

			<!-- Hours Entry/Display -->
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Daily Hours</CardTitle>
							<CardDescription>
								{canEdit ? 'Enter your hours for scheduled workdays' : 'Hours worked'}
							</CardDescription>
						</div>
						<div class="flex gap-2">
							{#if canEdit}
								<Badge variant="secondary" class="gap-1">
									<Edit class="h-3 w-3" />
									Editable
								</Badge>
							{/if}
							<!-- DISCREPANCY edits are handled by admins now; no Edit
							     button on the candidate side. -->

						</div>
					</div>
				</CardHeader>

				<CardContent>
                {#if canEdit}
                    <!-- ✅ EDIT MODE: Responsive layout -->
                    {#if scheduledWorkDays.length > 0}
                    <div class="space-y-4">
                        {#each scheduledWorkDays as { dateKey, dayString }}
                        {#if timeEntries[dateKey]}
                            {@const shiftEnded = isShiftOver(dateKey)}
                            <div class="p-3 bg-gray-50 rounded-lg space-y-3">
                            <!-- Date Header -->
                            <div class="flex items-center justify-between">
                                <p class="text-sm font-medium">{dayString}</p>
                                <p class="text-sm font-semibold text-blue-700">
                                {timeEntries[dateKey]?.hours?.toFixed(2) || '0.00'} hrs
                                </p>
                            </div>

                            {#if !shiftEnded}
                                <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    You can enter your hours once this shift has ended.
                                </p>
                            {/if}

                            <!-- Work Hours Row -->
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                <Label for="{dateKey}-start" class="text-xs text-gray-600">Start Time</Label>
                                <Input
                                    id="{dateKey}-start"
                                    type="time"
                                    class="text-sm mt-1"
                                    disabled={!shiftEnded}
                                    value={timeEntries[dateKey].startTime}
                                    on:input={(e) => updateTimeEntry(dateKey, 'startTime', e.currentTarget.value)}
                                />
                                </div>
                                <div>
                                <Label for="{dateKey}-end" class="text-xs text-gray-600">End Time</Label>
                                <Input
                                    id="{dateKey}-end"
                                    type="time"
                                    class="text-sm mt-1"
                                    disabled={!shiftEnded}
                                    value={timeEntries[dateKey].endTime}
                                    on:input={(e) => updateTimeEntry(dateKey, 'endTime', e.currentTarget.value)}
                                />
                                </div>
                            </div>

                            <!-- Lunch Hours Row (Optional) -->
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                <Label for="{dateKey}-lunch-start" class="text-xs text-gray-600">
                                    Lunch Start <span class="text-gray-400">(Optional)</span>
                                </Label>
                                <Input
                                    id="{dateKey}-lunch-start"
                                    type="time"
                                    class="text-sm mt-1"
                                    placeholder="Optional"
                                    disabled={!shiftEnded}
                                    value={timeEntries[dateKey].lunchStartTime}
                                    on:input={(e) => updateTimeEntry(dateKey, 'lunchStartTime', e.currentTarget.value)}
                                />
                                </div>
                                <div>
                                <Label for="{dateKey}-lunch-end" class="text-xs text-gray-600">
                                    Lunch End <span class="text-gray-400">(Optional)</span>
                                </Label>
                                <Input
                                    id="{dateKey}-lunch-end"
                                    type="time"
                                    class="text-sm mt-1"
                                    placeholder="Optional"
                                    disabled={!shiftEnded}
                                    value={timeEntries[dateKey].lunchEndTime}
                                    on:input={(e) => updateTimeEntry(dateKey, 'lunchEndTime', e.currentTarget.value)}
                                />
                                </div>
                            </div>

                            <!-- Show lunch duration if entered -->
                            {#if timeEntries[dateKey].lunchStartTime && timeEntries[dateKey].lunchEndTime}
                                {@const lunchDuration = calculateLunchHours(
                                timeEntries[dateKey].lunchStartTime,
                                timeEntries[dateKey].lunchEndTime
                                )}
                                <div class="text-xs text-gray-600 flex items-center gap-1">
                                <span>🍽️</span>
                                <span>Lunch break: {lunchDuration.toFixed(2)} hrs (unpaid)</span>
                                </div>
                            {/if}
                            </div>
                        {/if}
                        {/each}

                        <!-- Discrepancy editing is handled by admin now; no
                             "Cancel Editing" affordance needed on the
                             candidate side. -->

                    </div>

                    <!-- ✅ Helper text -->
                    <div class="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 flex gap-2">
                        <Info class="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <p>
                        <strong>Lunch breaks are optional.</strong> If you took a lunch break, enter the start and end times.
                        Your hours will automatically exclude the lunch duration.
                        </p>
                    </div>
                    {:else}
                    <div class="py-12 text-center text-muted-foreground">
                        <AlertCircle class="h-12 w-12 mx-auto mb-3" />
                        <p>No scheduled workdays found for this week</p>
                    </div>
                    {/if}
                {:else}
                    <!-- ✅ VIEW MODE: Already responsive -->
                    {#if timesheet?.hoursRaw && timesheet.hoursRaw.length > 0}
                    <div class="divide-y">
                        {#each timesheet.hoursRaw as entry}
                        <div class="py-3">
                            <div class="flex items-center justify-between mb-1">
                            <p class="font-medium">{formatFullDate(entry.date)}</p>
                            <p class="text-lg font-semibold">{entry.hours} hrs</p>
                            </div>
                            <div class="text-sm text-muted-foreground space-y-1">
                            <p>Work: {safeFormatDate(entry.startTime)} - {safeFormatDate(entry.endTime)}</p>
                            {#if entry.lunchStartTime && entry.lunchEndTime}
                                <p class="flex items-center gap-1">
                                <span class="text-xs">🍽️</span>
                                Lunch: {safeFormatDate(entry.lunchStartTime)} - {safeFormatDate(entry.lunchEndTime)}
                                </p>
                            {/if}
                            </div>
                        </div>
                        {/each}
                    </div>
                    {:else}
                    <div class="py-12 text-center text-muted-foreground">
                        <Clipboard class="h-12 w-12 mx-auto mb-3" />
                        <p>No hours recorded for this timesheet</p>
                    </div>
                    {/if}
                {/if}
                </CardContent>
			</Card>

			<!-- Expenses & Incidentals -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Receipt class="h-5 w-5" />
						Expenses & Incidentals
					</CardTitle>
					<CardDescription>
						Submit reimbursable expenses tied to this week's work. An admin or client will
						review each one before it's added to the invoice.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if canAddExpenses}
						<form
							method="POST"
							action="?/addExpense"
							use:addExpenseEnhance
							class="flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row sm:items-end"
						>
							<div class="flex-1">
								<Label for="addExpenseDescription" class="text-xs">Description</Label>
								<Input
									id="addExpenseDescription"
									name="description"
									bind:value={$addExpenseFormData.description}
									placeholder="e.g. Parking, supplies, mileage"
									disabled={$addExpenseSubmitting}
									required
								/>
							</div>
							<div class="w-full sm:w-32">
								<Label for="addExpenseAmount" class="text-xs">Amount ($)</Label>
								<Input
									id="addExpenseAmount"
									name="amountDollars"
									type="number"
									step="0.01"
									min="0.01"
									bind:value={$addExpenseFormData.amountDollars}
									placeholder="0.00"
									disabled={$addExpenseSubmitting}
									required
								/>
							</div>
							<Button
								type="submit"
								size="sm"
								class="bg-primary hover:bg-primary/90 sm:w-auto"
								disabled={$addExpenseSubmitting}
							>
								{#if $addExpenseSubmitting}
									<Loader2 class="h-4 w-4 animate-spin" />
									Adding…
								{:else}
									<Plus class="h-4 w-4" />
									Add Expense
								{/if}
							</Button>
						</form>
					{/if}

					{#if expenses.length === 0}
						<p class="text-sm text-gray-500">No expenses submitted for this timesheet.</p>
					{:else}
						<div class="space-y-2">
							{#each expenses as expense (expense.id)}
								<div
									class="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm bg-gray-100"
								>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium">{expense.description}</p>
										{#if expense.status === 'REJECTED' && expense.rejectionReason}
											<p class="text-xs text-red-700">Rejected: {expense.rejectionReason}</p>
										{/if}
									</div>
									<div class="font-mono text-sm font-semibold">
										${(expense.amountCents / 100).toFixed(2)}
									</div>
									<StatusBadge status={expense.status} />
									{#if expense.status === 'PENDING' && canAddExpenses}
										<form
											method="POST"
											action="?/deleteExpense"
											use:enhance
											on:submit={(e) => {
												if (!confirm('Delete this expense?')) e.preventDefault();
											}}
										>
											<input type="hidden" name="expenseId" value={expense.id} />
											<Button type="submit" size="sm" variant="ghost" title="Delete">
												<Trash2 class="h-4 w-4 text-red-700" />
											</Button>
										</form>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Shift Details -->
			<!-- <Card>
				<CardHeader>
					<CardTitle>Shift Information</CardTitle>
					<CardDescription>Details about the work assignment</CardDescription>
				</CardHeader>

				<CardContent class="space-y-4">
					<div class="flex items-start gap-4">
						<div class="bg-blue-100 rounded-full p-2.5">
							<CalendarDays class="h-5 w-5 text-blue-700" />
						</div>
						<div>
							<h3 class="font-medium">Date & Schedule</h3>
							{#if recurrenceDay}
								<p class="text-muted-foreground">{formatFullDate(recurrenceDay.date)}</p>
								<p class="text-muted-foreground">
									Work Hours: {safeFormatDate(recurrenceDay.dayStartTime)} - {safeFormatDate(
										recurrenceDay.dayEndTime
									)}
								</p>
								<p class="text-muted-foreground">
									Lunch Break: {safeFormatDate(recurrenceDay.lunchStartTime)} - {safeFormatDate(
										recurrenceDay.lunchEndTime
									)}
								</p>
							{:else}
								<p class="text-muted-foreground">Schedule information not available</p>
							{/if}
						</div>
					</div>

					{#if requisition?.jobDescription}
						<div class="flex items-start gap-4">
							<div class="bg-blue-100 rounded-full p-2.5">
								<Info class="h-5 w-5 text-blue-700" />
							</div>
							<div>
								<h3 class="font-medium">Job Description</h3>
								<p class="text-muted-foreground whitespace-pre-wrap">
									{requisition.jobDescription}
								</p>
							</div>
						</div>
					{/if}

					{#if requisition?.specialInstructions}
						<Alert>
							<Info class="h-4 w-4" />
							<AlertTitle>Special Instructions</AlertTitle>
							<AlertDescription class="whitespace-pre-wrap">
								{requisition.specialInstructions}
							</AlertDescription>
						</Alert>
					{/if}
				</CardContent>
			</Card> -->
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Company Information -->
			<Card>
				<CardHeader>
					<CardTitle>Company</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center gap-3">
						{#if company?.logo}
							<img
								src={company.logo}
								alt={company.name}
								class="w-12 h-12 rounded-full object-cover"
							/>
						{:else}
							<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
								<Building class="w-6 h-6 text-gray-500" />
							</div>
						{/if}
						<div>
							<h3 class="font-semibold">{company?.name || 'Company Name'}</h3>
							{#if requisition?.id}
								<p class="text-sm text-muted-foreground">Requisition #{requisition.id}</p>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Timesheet Actions -->
			<Card>
				<CardHeader>
					<CardTitle>Actions</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<p class="text-sm text-muted-foreground">
						{#if isDraft}
							Save your hours each day as your shifts end. Submit when the last
							shift of the week has finished and you're ready for approval.
						{:else if isPending}
							This timesheet is pending approval.
						{:else if isDiscrepancy}
							This timesheet was returned for review. An admin will follow up
							with corrections — no action needed from you here.
						{:else if isVoid}
							This timesheet has been voided.
						{:else if isRejected}
							This timesheet has been rejected.
						{:else if isApproved}
							This timesheet has been approved and processed.
						{/if}
					</p>

					<div class="space-y-2">
						<!-- ✅ SAVE DRAFT + SUBMIT BUTTONS (for DRAFT only) -->
						{#if isDraft}
							<!-- Save Draft: persist current entries without changing
							     status. No "last shift ended" requirement — the
							     candidate can save partial hours each evening. -->
							<form action="?/saveDraftTimesheet" method="POST" use:enhance>
								<input type="hidden" name="entries" value={JSON.stringify(timeEntries)} />
								<input type="hidden" name="totalHours" value={totalHours} />
								<Button
									type="submit"
									variant="outline"
									disabled={!canSaveDraft}
									class="w-full gap-2"
								>
									<Save class="h-4 w-4" />
									<span>Save Draft</span>
								</Button>
							</form>

							<AlertDialog.Root bind:open={submitDialogOpen}>
								<AlertDialog.Trigger asChild>
									<Button
										on:click={() => (submitDialogOpen = true)}
										disabled={!canSubmit}
										class="w-full gap-2 bg-primary hover:bg-primary/90"
									>
										<CheckCircle2 class="h-4 w-4" />
										<span>Submit Timesheet</span>
									</Button>
								</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Header>
										<AlertDialog.Title>Submit Timesheet</AlertDialog.Title>
										<AlertDialog.Description>
											You're submitting {totalHours.toFixed(2)} hours for the week of {formattedWeekRange}.
											This will send your timesheet for approval and lock further edits.
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer>
										<Button variant="destructiveOutline" on:click={() => (submitDialogOpen = false)}>
											Cancel
										</Button>
										<form action="?/submitTimesheet" method="POST" use:enhance>
											<input type="hidden" name="entries" value={JSON.stringify(timeEntries)} />
											<input type="hidden" name="totalHours" value={totalHours} />
											<Button
												type="submit"
												on:click={() => (submitDialogOpen = false)}
												class="ml-2 bg-primary hover:bg-primary/90"
											>
												Submit
											</Button>
										</form>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
    					    {#if hasHoursEntered && totalHours > 0 && !latestShiftEnded}
                                <p class="text-sm text-amber-600 mt-2">
                                <AlertCircle class="h-4 w-4 inline mr-1" />
                                You can submit this timesheet after your last shift of the week has ended.
                                </p>
                            {/if}
						{/if}

						<!-- ✅ CANCEL BUTTON (for DRAFT or PENDING) -->
						<!-- {#if isDraft || isPending}
							<AlertDialog.Root bind:open={cancelDialogOpen}>
								<AlertDialog.Trigger asChild>
									<Button
										on:click={() => (cancelDialogOpen = true)}
										variant="destructiveOutline"
										class="w-full border-red-200 text-red-700 hover:bg-red-50 gap-2"
									>
										<XCircle class="h-4 w-4" />
										<span>Cancel Timesheet</span>
									</Button>
								</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Header>
										<AlertDialog.Title>Are you sure?</AlertDialog.Title>
										<AlertDialog.Description>
											This action cannot be undone. This timesheet will be voided permanently.
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer>
										<Button variant="destructiveOutline" on:click={() => (cancelDialogOpen = false)}>
											Cancel
										</Button>
										<form action="?/cancelTimesheet" method="POST" use:enhance>
											<Button
												type="submit"
												on:click={() => (cancelDialogOpen = false)}
												variant="destructive"
												class="ml-2"
											>
												Void Timesheet
											</Button>
										</form>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
						{/if} -->
					</div>
				</CardContent>
			</Card>

			<!-- Support Information -->
			<Card>
				<CardHeader>
					<CardTitle>Need Help?</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-muted-foreground mb-4">
						If you have questions about this timesheet, please contact support.
					</p>

					<Button variant="outline" class="w-full">Contact Support</Button>
				</CardContent>
			</Card>
		</div>
	</div>
</section>
