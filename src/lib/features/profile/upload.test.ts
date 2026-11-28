import { describe, expect, it } from 'vitest';
import { matchesAccept, shrunkDimensions } from './upload';

describe('matchesAccept', () => {
	it('matches extensions without caring about case', () => {
		expect(matchesAccept({ name: 'CV.PDF', type: '' }, ['.pdf'])).toBe(true);
	});
	it('matches mime wildcards', () => {
		expect(matchesAccept({ name: 'a', type: 'image/heic' }, ['image/*'])).toBe(true);
	});
	it('refuses anything else', () => {
		expect(matchesAccept({ name: 'run.exe', type: 'application/x-msdownload' }, ['image/*', '.pdf'])).toBe(false);
	});
});

describe('shrunkDimensions', () => {
	it('scales the long edge down and keeps the shape', () => {
		expect(shrunkDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 });
		expect(shrunkDimensions(3000, 4000)).toEqual({ width: 1500, height: 2000 });
	});
	it('never enlarges a small photo', () => {
		expect(shrunkDimensions(800, 600)).toEqual({ width: 800, height: 600 });
	});
});
