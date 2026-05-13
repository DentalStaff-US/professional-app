import { describe, it, expect } from 'vitest';
import convertNameToInitials from './convertNameToInitials';

describe('convertNameToInitials', () => {
	it('returns first letter of first + last name', () => {
		expect(convertNameToInitials('Jane', 'Doe')).toBe('JD');
		expect(convertNameToInitials('Albert', 'Rousseau')).toBe('AR');
	});

	it('handles single-character names', () => {
		expect(convertNameToInitials('A', 'B')).toBe('AB');
	});

	it('handles unicode characters via Array.from grapheme split', () => {
		// Emojis and combined characters should be treated as a single grapheme.
		expect(convertNameToInitials('Émile', 'Łukasz')).toBe('ÉŁ');
	});
});
