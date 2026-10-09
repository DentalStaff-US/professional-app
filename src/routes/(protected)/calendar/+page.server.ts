import { generateToken } from '$lib/server/utils';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, RequestEvent } from './$types';
import { message, superValidate } from 'sveltekit-superforms/server';
import { recurrenceDayClaimSchema } from '$lib/config/zod-schemas';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE, adminForwardHeaders } from '$lib/server/fetchAdmin';
import { getCandidateStatus, inactiveAccountMessage } from '$lib/server/candidateStatus';
import { logger } from '$lib/server/logger';
import { candidateAvailabilitySchema } from '$lib/config/zod-schemas';
import { todayInBusinessTz } from '$lib/components/availability/availability';

type RecurrenceDayEntry = any;

export const load: PageServerLoad = async (event) => {
	// Deliberately NOT cached. A candidate who edits their availability and comes
	// back here must see the board change immediately; a 60s cache made a saved
	// change look like it had failed.
	const { locals, url } = event;
	const { user } = locals;

	if (!user) {
		return redirect(303, '/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}

	const token = generateToken(user.id);

	// A URL param rather than component state, so "show me the shifts my
	// availability is hiding" survives a refresh and can be shared with support.
	const showUnavailable = url.searchParams.get('showUnavailable') === '1';
	const today = todayInBusinessTz();
	const availabilityTo = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;

	// Fetch openings (recurrence days still claimable), the candidate's own
	// workdays (past + future claimed shifts), their profile, and their stated
	// availability in parallel. Any failure degrades that single bucket to empty;
	// the page still renders.
	const [openingsRes, workdaysRes, profileRes, availabilityRes] = await Promise.all([
		fetchAdmin<{
			recurrenceDays: any[];
			availability?: { availableDays: number[] | null; isCustomised: boolean; hiddenByAvailability: number };
			workPreference?: {
				preference: 'TEMP' | 'PERMANENT' | 'BOTH' | null;
				excluded: { preference: string; message: string } | null;
			};
		}>(
			`/api/external/getTempRequisitionsForCandidate${showUnavailable ? '?includeUnavailable=true' : ''}`,
			{ token }
		),
		fetchAdmin<{ data: any[] }>('/api/external/getWorkdaysForCandidate', { token }),
		fetchAdmin<any>('/api/external/getCandidateProfile', { token }),
		fetchAdmin<{
			availableDays: number[] | null;
			blackouts: Array<{ date: string }>;
			bookedDates: Array<{ date: string; requisitionId: number; workdayId: string }>;
		}>(`/api/external/getCandidateAvailability?from=${today}&to=${availabilityTo}`, { token })
	]);

	const tempRecurrenceDays = openingsRes.ok ? (openingsRes.data.recurrenceDays ?? []) : [];
	const workdayRecurrenceDays = workdaysRes.ok
		? (workdaysRes.data.data ?? []).map((w) => ({
				recurrenceDay: w.recurrenceDay,
				requisition: w.requisition,
				workday: w.workday,
				company: w.company,
				location: w.location
			}))
		: [];

	// Dedup: the temp endpoint already excludes recurrence days the candidate
	// claimed (their status flips to FILLED), but belt-and-suspenders against
	// overlap. Key off recurrenceDay.id.
	const seen = new Set<string>();
	const merged: RecurrenceDayEntry[] = [];
	for (const entry of [...workdayRecurrenceDays, ...tempRecurrenceDays] as RecurrenceDayEntry[]) {
		const id = entry?.recurrenceDay?.id;
		if (!id || seen.has(id)) continue;
		seen.add(id);
		merged.push(entry);
	}

	return {
		user,
		profile: profileRes.ok ? profileRes.data : null,
		recurrenceDays: merged,
		// The claim form MUST come from the load. The page previously declared
		// `export let applyForm`, which a +page.svelte never receives — superforms
		// silently fabricated an empty form, so every fail() from the claim action
		// (including the inactive-account message) was dropped on the floor.
		claimForm: await superValidate(event, recurrenceDayClaimSchema),
		// Seeded from CURRENT values, never superValidate(event, ...) — an empty form
		// here would wipe the professional's availability on first save.
		availabilityForm: await superValidate(
			{
				availableDays: availabilityRes.ok ? availabilityRes.data.availableDays : null,
				blockedDates: availabilityRes.ok ? availabilityRes.data.blackouts.map((b) => b.date) : [],
				replaceFrom: today,
				replaceTo: availabilityTo
			},
			candidateAvailabilitySchema
		),
		today,
		availabilityWindow: { from: today, to: availabilityTo },
		// Gates the edit mode. Without this an editor rendered from a failed load,
		// then saved, would delete every blackout the professional has.
		availabilityLoaded: availabilityRes.ok,
		bookedDates: availabilityRes.ok
			? availabilityRes.data.bookedDates.map((b) => ({
					date: b.date,
					label: `Working — Req #${b.requisitionId}`,
					workdayId: b.workdayId
				}))
			: [],
		// Same purpose as `certLocked`: explain an absence rather than let shifts
		// quietly disappear.
		hiddenByAvailability: openingsRes.ok
			? (openingsRes.data.availability?.hiddenByAvailability ?? 0)
			: 0,
		availabilityIsCustomised: openingsRes.ok
			? (openingsRes.data.availability?.isCustomised ?? false)
			: false,
		showUnavailable,
		// See permanent/+page.server.ts.
		workPreference: openingsRes.ok ? openingsRes.data.workPreference : undefined,
		loadError:
			openingsRes.ok && workdaysRes.ok && profileRes.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	claimWorkdayShift: async (event: RequestEvent) => {
		const userId = event.locals.user?.id;
		const token = generateToken(userId);
		const form = await superValidate(event, recurrenceDayClaimSchema);
		const recurrenceDayId = form.data.recurrenceDayId;
		// Claiming a shift on a day they marked off is their own override, so the
		// admin app permits it only when the intent is explicit. Without this the
		// "Show them anyway" affordance would show a shift that cannot be claimed.
		const acknowledgeUnavailable =
			(await event.request.clone().formData().catch(() => null))?.get('acknowledgeUnavailable') ===
			'true';

		if (!userId || !recurrenceDayId) {
			return fail(400, {
				form: { ...form, errors: { _errors: ['Missing required information'] } }
			});
		}

		if (!form.valid) {
			return fail(400, { form });
		}

		// Block non-active candidates before the cross-app request.
		const status = await getCandidateStatus(userId);
		if (status !== 'ACTIVE') {
			return fail(403, {
				form: { ...form, errors: { _errors: [inactiveAccountMessage(status)] } }
			});
		}

		try {
			const req = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/applyForTempRequisition`, {
				method: 'POST',
				body: JSON.stringify({ recurrenceDayId, acknowledgeUnavailable }),
				headers: {
					...adminForwardHeaders(),
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			const responseData = await req.json();

			if (!req.ok || !responseData.success) {
				return fail(req.status || 403, {
					form: {
						...form,
						errors: {
							_errors: [responseData.message || 'Failed to claim shift']
						}
					}
				});
			}
			setFlash(
				{
					type: 'success',
					message: 'Successfully claimed shift.'
				},
				event
			);
			return message(form, 'Successfully claimed shift!');
		} catch (error) {
			logger.error('Failed to claim workday shift', {
				error,
				recurrenceDayId,
				distinctId: userId
			});
			setFlash(
				{
					type: 'error',
					message: 'Something went wrong while claiming the shift'
				},
				event
			);
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Something went wrong while claiming the shift']
					}
				}
			});
		}
	},

	/**
	 * Saving availability from the calendar's edit mode.
	 *
	 * The same window-scoped contract as settings/availability: the form declares
	 * the window it is authoritative for, so a save here cannot delete rows the
	 * calendar never loaded.
	 */
	saveAvailability: async (event: RequestEvent) => {
		const user = event.locals.user;
		if (!user) return redirect(303, '/sign-in');

		const form = await superValidate(event, candidateAvailabilitySchema);
		if (!form.valid) return fail(400, { form });

		const res = await fetchAdmin('/api/external/updateCandidateAvailability', {
			method: 'POST',
			token: generateToken(user.id),
			body: {
				availableDays: form.data.availableDays,
				blackouts: {
					from: form.data.replaceFrom,
					to: form.data.replaceTo,
					dates: form.data.blockedDates
				}
			}
		});

		if (!res.ok) {
			setFlash({ type: 'error', message: res.error || 'Could not save your availability.' }, event);
			return fail(res.status ?? 500, { form });
		}

		setFlash({ type: 'success', message: 'Availability saved.' }, event);
		return message(form, 'saved');
	}
};
