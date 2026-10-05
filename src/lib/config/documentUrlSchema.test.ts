import { describe, it, expect } from 'vitest';
import { superValidate } from 'sveltekit-superforms/server';
import { z } from 'zod';
import { documentUrlSchema } from './zod-schemas';

/**
 * The expiry a professional types must survive the trip to the server. It silently
 * did not during testing, which looked exactly like they had left it blank — these
 * pin the contract so that cannot regress unnoticed.
 */

function fd(values: Record<string, string>) {
	const f = new FormData();
	for (const [k, v] of Object.entries(values)) f.append(k, v);
	return f;
}

describe('documentUrlSchema over FormData', () => {
	it('carries the expiry and discipline the professional entered', async () => {
		const form = await superValidate(
			fd({
				documentType: 'CERTIFICATE',
				documentDisciplineId: 'disc-efda',
				documentExpiryDate: '2029-10-16',
				filesData: '[]'
			}),
			documentUrlSchema
		);
		expect(form.data.documentExpiryDate).toBe('2029-10-16');
		expect(form.data.documentDisciplineId).toBe('disc-efda');
	});

	it('accepts a link with no expiry at all', async () => {
		// A dental license is held until revoked, so a dateless credential is normal.
		const form = await superValidate(
			fd({ documentType: 'LICENSE', documentDisciplineId: 'disc-efda', filesData: '[]' }),
			documentUrlSchema
		);
		expect(form.valid).toBe(true);
		expect(form.data.documentDisciplineId).toBe('disc-efda');
	});

	it('rejects a malformed date rather than silently dropping it', async () => {
		const form = await superValidate(
			fd({ documentType: 'CERTIFICATE', documentExpiryDate: '16/10/2029', filesData: '[]' }),
			documentUrlSchema
		);
		expect(form.valid).toBe(false);
	});
});
