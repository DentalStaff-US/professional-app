import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { generateToken } from '$lib/server/utils';
import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import {
	documentDeleteSchema,
	documentUpdateSchema,
	documentUrlSchema
} from '$lib/config/zod-schemas';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate, message, setError } from 'sveltekit-superforms/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/auth/sign-in');
	}
	const token = generateToken(user.id);
	const res = await fetchAdmin<{
		documents: any[];
		editable: boolean;
		lockReason: string | null;
	}>('/api/external/getCandidateDocuments', { token });

	const documentsForm = await superValidate(event, documentUrlSchema);

	return {
		user,
		documents: res.ok ? (res.data.documents ?? []) : [],
		// Approved accounts get a read-only view rather than controls that the
		// write endpoints would reject.
		editable: res.ok ? Boolean(res.data.editable) : false,
		lockReason: res.ok ? res.data.lockReason : null,
		documentsForm,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions = {
	documentsUpload: async (event) => {
		const { locals, request } = event;
		const { user } = locals;

		if (!user) {
			return redirect(302, '/sign-in');
		}

		const form = await superValidate(request, documentUrlSchema);

		if (!form.valid) {
			return fail(400, { form });
		}

		const fileData = form.data.filesData;

		try {
			const token = generateToken(user.id);

			const response = await fetch(
				`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/createCandidateDocument`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						// Honour the type the professional picked; the per-file value
						// wins if the form supplied one.
						type: form.data.documentType ?? 'OTHER',
						filesData: fileData
					})
				}
			);

			if (!response.ok) {
				const body = await response.text();
				logger.error('createCandidateDocument non-ok response', {
					status: response.status,
					body: body.slice(0, 500),
					distinctId: user.id
				});
				throw new Error(`Failed to update resume: ${response.statusText}`);
			}

			const userResponse = await fetch(`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/updateUserData`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ onboardingStep: 5 })
			});

			if (!userResponse.ok) {
				if (userResponse.status === 401) {
					throw error(401, 'Authentication failed');
				}
				throw error(userResponse.status, 'Failed to update user data');
			}

			setFlash({ type: 'success', message: 'Documents uploaded successfully' }, event);
			return message(
				{
					...form,
					data: {
						urls: undefined,
						filesData: undefined,
						url: undefined
					}
				},
				'Documents uploaded successfully'
			);
		} catch (err) {
			logger.error('Failed to upload documents', { error: err, distinctId: user.id });
			setFlash({ type: 'error', message: 'Failed to update documents' }, event);
			return setError(form, 'Failed to update documents');
		}
	},

	/**
	 * Re-categorise an existing document. The admin API is the authority on
	 * whether this is allowed (approved account or admin-locked document); a 403
	 * comes back with a human-readable reason, which we surface verbatim.
	 */
	updateDocumentType: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/auth/sign-in');

		const formData = await event.request.formData();
		const parsed = documentUpdateSchema.safeParse({
			documentId: formData.get('documentId'),
			type: formData.get('type')
		});

		if (!parsed.success) {
			setFlash({ type: 'error', message: 'Invalid document selection.' }, event);
			return fail(400, { error: 'Invalid document selection' });
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ message?: string }>('/api/external/updateCandidateDocument', {
			method: 'POST',
			token,
			body: parsed.data
		});

		if (!res.ok) {
			const msg = res.status === 403 ? res.error : 'Could not update this document.';
			setFlash({ type: 'error', message: msg }, event);
			return fail(res.status ?? 500, { error: msg });
		}

		setFlash({ type: 'success', message: 'Document updated.' }, event);
		return { success: true };
	},

	deleteDocument: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/auth/sign-in');

		const formData = await event.request.formData();
		const parsed = documentDeleteSchema.safeParse({ documentId: formData.get('documentId') });

		if (!parsed.success) {
			setFlash({ type: 'error', message: 'Invalid document selection.' }, event);
			return fail(400, { error: 'Invalid document selection' });
		}

		const token = generateToken(user.id);
		const res = await fetchAdmin<{ message?: string }>('/api/external/deleteCandidateDocument', {
			method: 'POST',
			token,
			body: parsed.data
		});

		if (!res.ok) {
			const msg = res.status === 403 ? res.error : 'Could not delete this document.';
			setFlash({ type: 'error', message: msg }, event);
			return fail(res.status ?? 500, { error: msg });
		}

		setFlash({ type: 'success', message: 'Document deleted.' }, event);
		return { success: true };
	}
};
