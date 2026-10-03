import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '$lib/server/utils';
import { superValidate, message, setError } from 'sveltekit-superforms/server';
import { newCandidateDisciplinesSchema } from '$lib/config/zod-schemas';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE, adminForwardHeaders } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;
	if (!user) {
		return redirect(302, '/sign-in');
	}

	const token = generateToken(user.id);

	const [profileRes, disciplinesRes, experienceRes, candidateDisciplinesRes, documentsRes] =
		await Promise.all([
			fetchAdmin<any>('/api/external/getCandidateProfile', { token }),
			fetchAdmin<{ disciplines: any[] }>('/api/external/getAllDisciplines'),
			fetchAdmin<{ experienceLevels: any[] }>('/api/external/getExperienceLevels'),
			fetchAdmin<{ disciplines: any[] }>('/api/external/getCandidateDisciplines', { token }),
			// Needed by the credential slot: an approved professional cannot edit this
			// page's experience data, but may attach or replace the CERTIFICATE for an
			// entry — including designating a document they already uploaded, which is
			// the only route for the legacy files that were all forced to type OTHER.
			fetchAdmin<{ documents: any[] }>('/api/external/getCandidateDocuments', { token })
		]);

	const form = await superValidate(event, newCandidateDisciplinesSchema);
	const allOk =
		profileRes.ok && disciplinesRes.ok && experienceRes.ok && candidateDisciplinesRes.ok;

	return {
		user,
		profile: profileRes.ok ? profileRes.data : null,
		form,
		disciplines: disciplinesRes.ok ? (disciplinesRes.data.disciplines ?? []) : [],
		experienceLevels: experienceRes.ok ? (experienceRes.data.experienceLevels ?? []) : [],
		candidateDisciplines: candidateDisciplinesRes.ok
			? (candidateDisciplinesRes.data.disciplines ?? [])
			: [],
		documents: documentsRes.ok ? (documentsRes.data.documents ?? []) : [],
		loadError: allOk ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions: Actions = {
	/**
	 * Designate a document the professional already uploaded as the certificate for one
	 * Experience & Rates entry.
	 *
	 * Writes ONLY to candidate_document_uploads (type + discipline link + expiry). It
	 * never touches candidate_discipline_experience, which is why an approved
	 * professional can use it while the rest of this page stays read-only.
	 *
	 * `intent: 'DESIGNATE_CREDENTIAL'` is what permits setting `type` after approval —
	 * the general retype stays frozen. See assertCandidateDocumentEditable.
	 */
	designateCredential: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/auth/sign-in');

		const fd = await event.request.formData();
		const documentId = String(fd.get('documentId') ?? '');
		const disciplineId = String(fd.get('disciplineId') ?? '');
		const expiryDate = String(fd.get('expiryDate') ?? '');

		if (!documentId || !disciplineId || !expiryDate) {
			setFlash({ type: 'error', message: 'Pick a document and an expiration date.' }, event);
			return fail(400, { error: 'Missing fields' });
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ message?: string }>('/api/external/updateCandidateDocument', {
			method: 'POST',
			token,
			body: {
				documentId,
				disciplineId,
				expiryDate,
				// Promote it to a credential type; legacy uploads were all forced to OTHER.
				type: 'CERTIFICATE',
				intent: 'DESIGNATE_CREDENTIAL'
			}
		});

		if (!res.ok) {
			const msg = res.error || 'Could not use that document as your certificate.';
			setFlash({ type: 'error', message: msg }, event);
			return fail(res.status ?? 500, { error: msg });
		}

		setFlash({ type: 'success', message: 'Certificate saved.' }, event);
		return { success: true };
	},

	/**
	 * Upload a new certificate and link it to one entry in a single step. Renewal:
	 * the previous certificate is deliberately left on file, and the gate reads
	 * MAX(expiry_date), so the newest one wins without anything being deleted.
	 */
	uploadCredential: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/auth/sign-in');

		const fd = await event.request.formData();
		const url = String(fd.get('url') ?? '');
		const filename = String(fd.get('filename') ?? '');
		const disciplineId = String(fd.get('disciplineId') ?? '');
		const expiryDate = String(fd.get('expiryDate') ?? '');

		if (!url || !disciplineId || !expiryDate) {
			setFlash({ type: 'error', message: 'Choose a file and an expiration date.' }, event);
			return fail(400, { error: 'Missing fields' });
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ message?: string }>('/api/external/createCandidateDocument', {
			method: 'POST',
			token,
			body: { type: 'CERTIFICATE', url, filename, disciplineId, expiryDate }
		});

		if (!res.ok) {
			const msg = res.error || 'Could not save that certificate.';
			setFlash({ type: 'error', message: msg }, event);
			return fail(res.status ?? 500, { error: msg });
		}

		setFlash({ type: 'success', message: 'Certificate saved.' }, event);
		return { success: true };
	},

	submitExperience: async (event) => {
		const { locals, request } = event;
		const { user } = locals;

		if (!user) {
			return redirect(302, '/sign-in');
		}

		const form = await superValidate(request, newCandidateDisciplinesSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		const disciplines = form.data.disciplines;

		if (!disciplines || disciplines.length === 0) {
			setError(form, 'Please select at least one discipline');
			return fail(400, { form });
		}

		try {
			const token = generateToken(user.id);
			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateCandidateExperience`,
				{
					method: 'POST',
					headers: {
						...adminForwardHeaders(),
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ disciplines })
				}
			);

			if (!response.ok) {
				return setError(form, `Failed to update disciplines: ${response.statusText}`);
			}

			setFlash({ type: 'success', message: 'Work experience updated successfully' }, event);
		} catch (err) {
			logger.error('Failed to update candidate disciplines', {
				error: err,
				distinctId: user.id
			});
			setFlash({ type: 'error', message: 'Failed to update work experience' }, event);
			return setError(form, 'Failed to update work experience');
		}
		return message(form, 'Work experience updated successfully');
	}
};
