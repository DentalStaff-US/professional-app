import type { CredentialDiscipline } from '$lib/components/certifications/types';

export function toCredentialDisciplines(disciplines: any[] | null | undefined): CredentialDiscipline[] {
	return (disciplines ?? []).map((d) => ({
		disciplineId: d.disciplineId,
		name: d.name,
		abbreviation: d.abbreviation,
		requiresLicense: Boolean(d.requiresLicense),
		effectiveLicenseExpiry: d.effectiveLicenseExpiry ?? null,
		licenseGraceStartedOn: d.licenseGraceStartedOn ?? null,
		requiresCert: Boolean(d.requiresCert),
		effectiveCertExpiry: d.effectiveCertExpiry ?? null
	}));
}
