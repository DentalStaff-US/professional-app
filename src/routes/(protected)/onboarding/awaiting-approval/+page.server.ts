import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';
import { resolveJobIntentRedirect } from '$lib/server/jobIntentRedirect';
import { buildChecklist } from '$features/onboarding/checklist';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/auth/sign-in');
	}

	const token = generateToken(user.id);
	const [res, disciplines, documents, resume] = await Promise.all([
		fetchAdmin<{ approved?: boolean; status?: string; createdAt?: string; completeAddress?: string | null; cellPhone?: string | null }>(
			'/api/external/getCandidateProfile',
			{ token }
		),
		fetchAdmin<{ disciplines: any[] }>('/api/external/getCandidateDisciplines', { token }),
		fetchAdmin<{ documents: any[] }>('/api/external/getCandidateDocuments', { token }),
		fetchAdmin<{ resume: unknown }>('/api/external/getRecentCandidateResume', { token })
	]);

	if (res.ok && user.completedOnboarding && res.data.approved) {
		// Skip the dashboard hop when they came from a public job. Returns (no
		// redirect) when there is no intent or they aren't ACTIVE yet.
		await resolveJobIntentRedirect(event);
		redirect(302, '/dashboard');
	}

	// All or nothing: a failed lookup must not read as "missing" on their application.
	const allOk = res.ok && disciplines.ok && documents.ok && resume.ok;

	return {
		user,
		profile: res.ok ? res.data : null,
		checklist: allOk
			? buildChecklist({
					profile: res.data,
					disciplines: disciplines.data.disciplines ?? [],
					documents: documents.data.documents ?? [],
					hasResume: Boolean(resume.data.resume)
				})
			: null,
		loadError: allOk ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};
