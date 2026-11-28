import { credentialState, formatCertDate, todayInET } from '$lib/certStatus';

export type HomeNudge = { id: string; title: string; text: string; href: string; action: string };

type NudgeInput = {
	profile?: { completeAddress?: string | null; cellPhone?: string | null } | null;
	disciplines?: {
		disciplineId: string;
		name: string;
		requiresLicense?: boolean;
		effectiveLicenseExpiry?: string | null;
		requiresCert?: boolean;
		effectiveCertExpiry?: string | null;
	}[];
	today?: string;
};

/**
 * Things worth doing before they become a problem. Credentials that have already
 * expired aren't here: those block shifts, and the certificate banner covers them.
 */
export function homeNudges({ profile, disciplines = [], today = todayInET() }: NudgeInput): HomeNudge[] {
	const nudges: HomeNudge[] = [];

	for (const discipline of disciplines) {
		const credentials = [
			{ kind: 'license or registration', required: discipline.requiresLicense, expiresOn: discipline.effectiveLicenseExpiry },
			{ kind: 'certification', required: discipline.requiresCert, expiresOn: discipline.effectiveCertExpiry }
		];
		for (const { kind, required, expiresOn } of credentials) {
			if (credentialState({ required: Boolean(required), expiresOn: expiresOn ?? null }, today) !== 'EXPIRING') continue;
			nudges.push({
				id: `${discipline.disciplineId}-${kind}`,
				title: `Your ${discipline.name} ${kind} expires soon`,
				text: `It expires ${formatCertDate(expiresOn)}. Add your renewal so you can keep working.`,
				href: '/settings/experience',
				action: 'Add your renewal'
			});
		}
	}

	if (profile) {
		const gaps = [!profile.completeAddress && 'home address', !profile.cellPhone && 'cell phone'].filter(Boolean);
		if (gaps.length) {
			nudges.push({
				id: 'profile',
				title: 'Finish your profile',
				text: `Add your ${gaps.join(' and ')} so we can find work near you and reach you about it.`,
				href: '/settings/edit-profile',
				action: 'Edit profile'
			});
		}
	}
	return nudges;
}
