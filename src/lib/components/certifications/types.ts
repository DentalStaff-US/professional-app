/**
 * One of the professional's Experience & Rates entries, as the credential picker
 * needs it. Built from /api/external/getCandidateDisciplines joined to the
 * discipline's `requires_certification` flag and its effective expiry.
 */
export type CredentialDiscipline = {
	disciplineId: string;
	name: string;
	abbreviation: string;
	/** disciplines.requires_certification — marks entries awaiting a certificate. */
	requiresCertification: boolean;
	/** MAX(expiry_date) across credentials already linked; 'YYYY-MM-DD' or null. */
	effectiveExpiry: string | null;
};
