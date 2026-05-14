/**
 * UTCTimezoneUtils.ts - Corrected utility functions using date-fns-tz
 * Using the actual function names from the date-fns-tz documentation
 */
import { format, parse, isValid } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Get user's current timezone from browser
 * @returns Timezone string (e.g., 'America/New_York')
 */
export function getUserTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a timezone string for display
 * @param timezone IANA timezone string
 * @returns Human-readable timezone name
 */
export function formatTimezoneName(timezone: string): string {
	if (!timezone) return '';

	// Format for display (e.g., "America/New_York" -> "New York")
	const parts = timezone.split('/');
	const location = parts.length > 1 ? parts[parts.length - 1] : parts[0];
	return location.replace(/_/g, ' ');
}

/**
 * Gets a consistent UTC date string
 */
export function toUTCDateString(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toISOString().split('T')[0];
}

/**
 * Format time for display
 *
 * @param timeString Time string (HH:MM)
 * @param format12Hour Whether to use 12-hour format
 * @returns Formatted time string
 */
export function formatTimeForDisplay(timeString: string, format12Hour: boolean = true): string {
	if (!timeString) return '';

	try {
		// Parse time
		const [hours, minutes] = timeString.split(':').map(Number);

		// Create a date object with today's date and the specified time
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);

		// Format according to preference
		return format(date, format12Hour ? 'h:mm a' : 'HH:mm');
	} catch (error) {
		return timeString;
	}
}

/**
 * Get week start date (Sunday) for a given date in UTC
 *
 * @param dateString UTC date string (YYYY-MM-DD)
 * @returns Sunday date string (YYYY-MM-DD) in UTC
 */
export function getUTCWeekStartDate(dateString: string): string {
	if (!dateString) return '';

	try {
		// Parse date as UTC
		const date = parse(dateString, 'yyyy-MM-dd', new Date());

		if (!isValid(date)) {
			return dateString;
		}

		// Work weeks run Monday → Sunday. getUTCDay() returns 0=Sun…6=Sat;
		// shift so that Monday is the start, then walk back to that Monday.
		const dayOfWeek = date.getUTCDay();
		const offsetToMonday = (dayOfWeek + 6) % 7;
		const monday = new Date(date);
		monday.setUTCDate(date.getUTCDate() - offsetToMonday);

		// Format as YYYY-MM-DD
		return format(monday, 'yyyy-MM-dd');
	} catch (error) {
		console.error('Error getting UTC week start date:', error);
		return dateString;
	}
}

/**
 * Calculate hours between start and end times
 *
 * @param startTime Start time (HH:MM)
 * @param endTime End time (HH:MM)
 * @returns Number of hours (decimal)
 */
export function calculateHours(startTime: string, endTime: string): number {
	if (!startTime || !endTime) return 0;

	try {
		const [startHours, startMins] = startTime.split(':').map(Number);
		const [endHours, endMins] = endTime.split(':').map(Number);

		if (isNaN(startHours) || isNaN(startMins) || isNaN(endHours) || isNaN(endMins)) {
			return 0;
		}

		const startTotalMins = startHours * 60 + startMins;
		const endTotalMins = endHours * 60 + endMins;

		// Handle case where end time is on next day
		const diffMins =
			endTotalMins >= startTotalMins
				? endTotalMins - startTotalMins
				: 24 * 60 - startTotalMins + endTotalMins;

		// Return hours with 2 decimal places
		return Math.round((diffMins / 60) * 100) / 100;
	} catch (error) {
		console.error('Error calculating hours:', error);
		return 0;
	}
}

/**
 * Format a date for display in user's timezone
 *
 * @param utcDateString UTC date string (YYYY-MM-DD)
 * @param targetTimezone Target timezone (default: user's timezone)
 * @param formatStr Format string for date-fns
 * @returns Formatted date string
 */
export function formatUTCDateForDisplay(
	utcDateString: string,
	targetTimezone: string = getUserTimezone(),
	formatStr: string = 'MMM d, yyyy'
): string {
	if (!utcDateString) return '';

	try {
		// Use formatInTimeZone for direct formatting
		return formatInTimeZone(utcDateString, targetTimezone, formatStr);
	} catch (error) {
		console.error('Error formatting UTC date:', error);
		return utcDateString;
	}
}

/**
 * Create UTC ISO 8601 date-time string
 *
 * @param localDateString Date string (YYYY-MM-DD) in local timezone
 * @param localTimeString Time string (HH:MM) in local timezone
 * @param localTimezone Source timezone
 * @returns UTC ISO string
 */
export function createUTCISOString(
	localDateString: string,
	localTimeString: string,
	localTimezone: string
): string {
	if (!localDateString || !localTimeString || !localTimezone) {
		return '';
	}

	try {
		// Parse local date and time
		const localDate = parse(
			`${localDateString} ${localTimeString}`,
			'yyyy-MM-dd HH:mm',
			new Date()
		);

		if (!isValid(localDate)) {
			return '';
		}

		// Convert to UTC - fromZonedTime converts to UTC time
		const utcDate = fromZonedTime(localDate, localTimezone);

		// Format as ISO string
		return utcDate.toISOString();
	} catch (error) {
		console.error('Error creating UTC ISO string:', error);
		return '';
	}
}

/**
 * Validate that a time string is in valid UTC time format (HH:MM)
 */
export function isValidUTCTime(time: string): boolean {
	if (!time) return false;

	// Check format
	if (!/^\d{2}:\d{2}$/.test(time)) return false;

	// Parse hours and minutes
	const [hours, minutes] = time.split(':').map(Number);

	// Validate range
	return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

/**
 * Convert a single recurrence day from form data to UTC format for database storage
 *
 * @param day The recurrence day data from the form
 * @param userTimezone The user's timezone
 * @returns Converted data ready for database storage with timestamp fields
 */
export function convertRecurrenceDayToUTC(day: Record<string, any>, userTimezone: string) {
	// Extract the original values
	const {
		date: localDate,
		dayStartTime: localStartTime,
		dayEndTime: localEndTime,
		lunchStartTime: localLunchStart,
		lunchEndTime: localLunchEnd,
		requisitionId
	} = day;

	// Convert each time to a full UTC Date object if time exists
	const dayStart = createUTCDateTime(localDate, localStartTime, userTimezone);

	const dayEnd = createUTCDateTime(localDate, localEndTime, userTimezone);

	const lunchStart = createUTCDateTime(localDate, localLunchStart, userTimezone);

	const lunchEnd = createUTCDateTime(localDate, localLunchEnd, userTimezone);

	// Extract the UTC date for the 'date' field (using the day start to determine UTC date)
	const utcDateStr = dayStart ? dayStart.toISOString().split('T')[0] : localDate;

	// Return data formatted for your PostgreSQL schema
	return {
		// For your schema's fields
		date: utcDateStr, // For the date field
		dayStart: dayStart, // Date object for timestamp field
		dayEnd: dayEnd,
		lunchStart: lunchStart,
		lunchEnd: lunchEnd,
		requisitionId
	};
}

/**
 * Create a JavaScript Date object in UTC from local date and time
 *
 * @param localDateStr The local date string (YYYY-MM-DD)
 * @param localTimeStr The local time string (HH:MM)
 * @param timezone The local timezone
 * @returns JavaScript Date object in UTC
 */
function createUTCDateTime(localDateStr: string, localTimeStr: string, timezone: string): Date {
	try {
		// Try using the utility function if available
		const utcIsoString = createUTCISOString(localDateStr, localTimeStr, timezone);
		return new Date(utcIsoString);
	} catch (error) {
		// Fallback to manual conversion
		const [year, month, day] = localDateStr.split('-').map(Number);
		const [hours, minutes] = localTimeStr.split(':').map(Number);

		// Create a Date object in local timezone
		const localDate = new Date(year, month - 1, day, hours, minutes);

		// Get the UTC equivalent
		return new Date(
			Date.UTC(
				localDate.getFullYear(),
				localDate.getMonth(),
				localDate.getDate(),
				localDate.getHours(),
				localDate.getMinutes()
			)
		);
	}
}

/**
 * Format a UTC timestamp for local display
 *
 * @param timestamp UTC timestamp from database
 * @param timezone Target timezone for display
 * @returns Formatted datetime string for the calendar
 */
export function formatTimestampForDisplay(timestamp: string | Date, timezone: string): string {
	if (!timestamp) return '';

	try {
		// Parse the timestamp as a Date object
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

		// Format it for local display with timezone consideration
		// Format matches what the calendar expects
		const formattedDate = formatInTimeZone(date, timezone, 'yyyy-MM-dd HH:mm:ss');

		// Add timezone info for debugging/display
		return `${formattedDate} ${formatInTimeZone(date, timezone, 'z')}`;
	} catch (error) {
		console.error('Error formatting timestamp:', error);
		return String(timestamp);
	}
}
