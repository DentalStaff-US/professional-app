import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { generateToken } from '$lib/server/utils';
import { fetchAdmin, ADMIN_LOAD_ERROR_MESSAGE } from '$lib/server/fetchAdmin';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	setHeaders({
		'cache-control': 'max-age=60'
	});
	const user = locals.user;

	if (!user) {
		redirect(302, '/auth/sign-in');
	}

	if (!user.completedOnboarding) {
		redirect(302, '/onboarding');
	}

	const token = generateToken(user.id);
	const [openingsRes, appliedRes] = await Promise.all([
		fetchAdmin<{
			requisitions: any[];
			certLocked?: any[];
			workPreference?: {
				preference: 'TEMP' | 'PERMANENT' | 'BOTH' | null;
				excluded: { preference: string; message: string } | null;
			};
		}>(
			'/api/external/getOpeningsForCandidate',
			{ token }
		),
		fetchAdmin<any>('/api/external/getAppliedRequisitions', { token })
	]);

	return {
		requisitions: openingsRes.ok ? (openingsRes.data.requisitions ?? []) : [],
		applied: appliedRes.ok ? appliedRes.data : null,
		// Disciplines hidden because their certification lapsed. Non-empty even when
		// openings were found, so the banner still explains a partial loss.
		certLocked: openingsRes.ok ? (openingsRes.data.certLocked ?? []) : [],
		// Explains an empty board caused by the professional's own temp/permanent
		// preference. Null whenever the preference is not the reason, so it cannot
		// shadow certLocked or "nothing nearby".
		workPreference: openingsRes.ok ? openingsRes.data.workPreference : undefined,
		loadError: openingsRes.ok && appliedRes.ok ? undefined : ADMIN_LOAD_ERROR_MESSAGE
	};
};
