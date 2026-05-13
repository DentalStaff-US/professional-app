import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { generateToken } from '../utils';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

export async function getSavedJobs(userId: string, token: string | undefined = undefined) {
	try {
		if (!token) token = generateToken(userId);

		const res = await fetch(
			`${PUBLIC_CLIENT_APP_DOMAIN}/api/external/getSavedOpeningsForCandidate`,
			{
				headers: { Authorization: `Bearer ${token}` }
			}
		);

		const rows = await res.json();

		const ids: number[] = rows.map(
			(row: { id: string; requisitionId: number; candidateId: string; status: string }) => {
				return row.requisitionId;
			}
		);

		return ids;
	} catch (err) {
		logger.error('Failed to load saved openings', { error: err, distinctId: userId });
		throw error(500, 'Error getting saved jobs from cache or database');
	}
}

export async function toggleBookmark(
	userId: string,
	_requisitionId: string,
	token: string | undefined = undefined
) {
	if (!token) token = generateToken(userId);

	try {
		const rows = await getSavedJobs(userId);
		return rows.length === 0;
	} catch (err) {
		logger.error('toggleBookmark failed', { error: err, distinctId: userId });
		throw error(500, 'Something went wrong');
	}
}
