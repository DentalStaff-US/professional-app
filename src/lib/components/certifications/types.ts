/**
 * One of the professional's Experience & Rates entries, with both credential tracks,
 * as /api/external/getCandidateDisciplines returns it.
 */
export type CredentialDiscipline = {
	disciplineId: string;
	name: string;
	abbreviation: string;
	/** disciplines.requires_license — a legal requirement for this discipline. */
	requiresLicense: boolean;
	/** MAX(expiry_date) across linked LICENSE documents; 'YYYY-MM-DD' or null. */
	effectiveLicenseExpiry: string | null;
	/** When the 30-day missing-license clock started, or null if never notified. */
	licenseGraceStartedOn: string | null;
	/** cde.requires_cert — declared by this professional for their state. */
	requiresCert: boolean;
	/** cde.cert_expires_on — authoritative for the certification track. */
	certExpiresOn: string | null;
};
