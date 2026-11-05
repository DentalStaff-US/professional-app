/** Sign-up speaks to the job they came from, when we can still find it. */
export function jobHeadline(job: {
	type: 'temp' | 'perm';
	discipline?: { name?: string | null } | null;
	city?: string | null;
}): string | null {
	const name = job.discipline?.name;
	if (!name) return null;
	const where = job.city ? ` in ${job.city}` : '';
	return job.type === 'temp' ? `Sign up to claim Temp ${name}${where}` : `Sign up to apply for ${name}${where}`;
}

/** The only rule is the schema's 6 characters. The rest is advice, not a requirement. */
export function passwordStrength(password: string): string {
	if (password.length < 6) return 'Use at least 6 characters.';
	const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((kind) => kind.test(password)).length;
	if (password.length >= 12 || (password.length >= 8 && kinds >= 3)) return 'Strong password.';
	return 'Good. A longer one is stronger.';
}
