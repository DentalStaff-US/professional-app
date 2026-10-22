import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { generateToken } from '$lib/server/utils';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';

/**
 * A professional's skills. Editable while their profile is pending; read-only once
 * approved (the admin API enforces it — `editable` here only decides what renders).
 * Uploading a certificate for a skill (e.g. CPR/BLS) stays open after approval,
 * the same way discipline certificates do.
 */

export type SkillsPayload = {
	skills: {
		skillId: string;
		name: string;
		categoryId: string;
		categoryName: string;
		requiresCertificate: boolean;
		certExpiresOn: string | null;
		effective: boolean;
	}[];
	catalog: {
		id: string;
		name: string;
		description: string | null;
		skills: { id: string; name: string; requiresCertificate: boolean; archivedAt: string | null }[];
	}[];
	editable: boolean;
	lockedReason: string | null;
};

export const load: PageServerLoad = async (event) => {
	const { user } = event.locals;
	if (!user) return redirect(302, '/sign-in');

	const res = await fetchAdmin<SkillsPayload>('/api/external/candidateSkills', {
		token: generateToken(user.id)
	});

	return {
		skills: res.ok ? res.data.skills : [],
		catalog: res.ok ? res.data.catalog : [],
		editable: res.ok ? res.data.editable : false,
		lockedReason: res.ok ? res.data.lockedReason : null,
		loadError: res.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};

export const actions: Actions = {
	saveSkills: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/sign-in');

		const fd = await event.request.formData();
		const skillIds = fd.getAll('skillIds').map(String).filter(Boolean);

		const res = await fetchAdmin<{ message?: string }>('/api/external/candidateSkills', {
			method: 'POST',
			token: generateToken(user.id),
			body: { skillIds }
		});

		if (!res.ok) {
			const msg = res.error || 'Could not save your skills.';
			setFlash({ type: 'error', message: msg }, event);
			return fail(res.status ?? 500, { error: msg });
		}

		setFlash({ type: 'success', message: 'Skills saved.' }, event);
		return { success: true };
	},

	/** Upload a certificate (file already stored via /api/uploadFile) for one skill. */
	uploadSkillCertificate: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/sign-in');

		const fd = await event.request.formData();
		const url = String(fd.get('url') ?? '');
		const filename = String(fd.get('filename') ?? '');
		const skillId = String(fd.get('skillId') ?? '');
		const expiryDate = String(fd.get('expiryDate') ?? '');

		if (!url || !skillId || !expiryDate) {
			setFlash({ type: 'error', message: 'Choose a file and an expiration date.' }, event);
			return fail(400, { error: 'Missing fields' });
		}

		const res = await fetchAdmin<{ message?: string }>('/api/external/createCandidateDocument', {
			method: 'POST',
			token: generateToken(user.id),
			body: { type: 'CERTIFICATE', url, filename, skillId, expiryDate }
		});

		if (!res.ok) {
			const msg = res.error || 'Could not save that certificate.';
			setFlash({ type: 'error', message: msg }, event);
			return fail(res.status ?? 500, { error: msg });
		}

		setFlash({ type: 'success', message: 'Certificate saved.' }, event);
		return { success: true };
	}
};
