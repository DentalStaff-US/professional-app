import { credentialState, formatCertDate, todayInET } from '$lib/certStatus';

export type ChecklistState = 'done' | 'missing' | 'optional' | 'review';
export type ChecklistItem = { id: string; label: string; detail: string; state: ChecklistState; href?: string };

type ChecklistInput = {
	profile: { completeAddress?: string | null; cellPhone?: string | null };
	disciplines: {
		disciplineId: string;
		name: string;
		requiresLicense?: boolean;
		effectiveLicenseExpiry?: string | null;
		licenseGraceStartedOn?: string | null;
		requiresCert?: boolean;
		effectiveCertExpiry?: string | null;
	}[];
	documents: { type?: string }[];
	hasResume: boolean;
	today?: string;
};

function credentialItem(
	id: string,
	label: string,
	input: { required: boolean; expiresOn: string | null; graceStartedOn?: string | null },
	today: string
): ChecklistItem {
	const state = credentialState(input, today);
	if (state === 'VALID' || state === 'EXPIRING') {
		return { id, label, state: 'done', detail: `On file, expires ${formatCertDate(input.expiresOn)}` };
	}
	return {
		id,
		label,
		state: 'missing',
		detail: state === 'EXPIRED' ? 'The one on file has expired' : 'Not on file yet',
		href: '/settings/documents'
	};
}

/** What's really on file, so the page never claims a step someone skipped. */
export function buildChecklist({ profile, disciplines, documents, hasResume, today = todayInET() }: ChecklistInput): ChecklistItem[] {
	const profileGaps = [!profile.completeAddress && 'address', !profile.cellPhone && 'cell phone'].filter(Boolean);
	const items: ChecklistItem[] = [
		profileGaps.length
			? { id: 'profile', label: 'Profile', state: 'missing', detail: `Add your ${profileGaps.join(' and ')}`, href: '/settings/edit-profile' }
			: { id: 'profile', label: 'Profile', state: 'done', detail: 'Address and cell phone on file' },
		disciplines.length
			? { id: 'experience', label: 'Experience', state: 'done', detail: disciplines.map((d) => d.name).join(', ') }
			: { id: 'experience', label: 'Experience', state: 'missing', detail: 'Add at least one discipline', href: '/settings/experience' },
		hasResume
			? { id: 'resume', label: 'Resume', state: 'done', detail: 'On file' }
			: { id: 'resume', label: 'Resume', state: 'missing', detail: 'Not on file yet', href: '/settings/resume' }
	];

	const credentials = disciplines.flatMap((d) => [
		...(d.requiresLicense
			? [credentialItem(`license-${d.disciplineId}`, `${d.name} license or registration`, { required: true, expiresOn: d.effectiveLicenseExpiry ?? null, graceStartedOn: d.licenseGraceStartedOn ?? null }, today)]
			: []),
		...(d.requiresCert
			? [credentialItem(`cert-${d.disciplineId}`, `${d.name} certification`, { required: true, expiresOn: d.effectiveCertExpiry ?? null }, today)]
			: [])
	]);
	items.push(...credentials);

	const otherDocuments = documents.filter((document) => document.type !== 'RESUME').length;
	if (otherDocuments) {
		items.push({ id: 'documents', label: 'Documents', state: 'done', detail: `${otherDocuments} on file` });
	} else if (!credentials.length) {
		items.push({ id: 'documents', label: 'Documents', state: 'optional', detail: 'Optional, but they can speed up your review', href: '/settings/documents' });
	}

	items.push({ id: 'review', label: 'Team review', state: 'review', detail: 'Our team is checking your details' });
	return items;
}
