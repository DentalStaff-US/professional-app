export type ExperienceRow = {
	key: number;
	disciplineId: string;
	experienceLevelId: string;
	min: string | number | null;
	max: string | number | null;
};

export type RowErrors = { discipline?: string; level?: string; rate?: string };

const isEmpty = (value: string | number | null) => value === null || value === '';
const rate = (value: string | number | null) => (isEmpty(value) ? 0 : Number(value));

/** A row nobody touched is left out, not reported as an error. */
export function rowIsBlank(row: ExperienceRow): boolean {
	return !row.disciplineId && !row.experienceLevelId && isEmpty(row.min) && isEmpty(row.max);
}

// Same rules as newCandidateDisciplinesSchema, which would otherwise report them on a
// nested path nobody sees.
export function rowErrors(row: ExperienceRow): RowErrors {
	const errors: RowErrors = {};
	if (!row.disciplineId) errors.discipline = 'Choose a discipline.';
	if (!row.experienceLevelId) errors.level = 'Choose your experience level.';
	const [min, max] = [rate(row.min), rate(row.max)];
	if (![min, max].every((value) => Number.isInteger(value) && value >= 0)) {
		errors.rate = 'Use whole dollar amounts.';
	} else if (max < min) {
		errors.rate = 'The maximum rate can\'t be lower than the minimum.';
	}
	return errors;
}

export function toEntries(rows: ExperienceRow[]) {
	return rows
		.filter((row) => !rowIsBlank(row))
		.map((row) => ({
			disciplineId: row.disciplineId,
			experienceLevelId: row.experienceLevelId,
			preferredHourlyMin: rate(row.min),
			preferredHourlyMax: rate(row.max)
		}));
}

/** Levels read "0-2 Years" and "10+ years", so the leading number gives the order. */
export function sortLevels<T extends { value: string }>(levels: T[]): T[] {
	const start = (level: T) => {
		const parsed = parseInt(level.value, 10);
		return Number.isNaN(parsed) ? Infinity : parsed;
	};
	return [...levels].sort((a, b) => start(a) - start(b));
}
