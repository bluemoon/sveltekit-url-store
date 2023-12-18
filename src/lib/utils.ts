import { z } from 'zod';

export type OptionalKeys<T> = {
	[K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? K : never;
}[keyof T];

export type FilteredKeys<T, U> = {
	[K in keyof T as T[K] extends U ? K : never]: T[K];
};

// Take array as a string and return zod array
export const queryNumberArray = z
	.string()
	.or(z.number())
	.or(z.array(z.number()))
	.transform((a) => {
		if (typeof a === 'string') return a.split(',').map((a) => Number(a));
		if (Array.isArray(a)) return a;
		return [a];
	});

// Take array as a string and return zod  number array
// Take string and return return zod string array - comma separated
export const queryStringArray = z
	.preprocess((a) => z.string().parse(a).split(','), z.string().array())
	.or(z.string().array());

/**
 * An alternative to Object.fromEntries that allows duplicate keys.
 */
export function fromEntriesWithDuplicateKeys(entries: IterableIterator<[string, string]> | null) {
	const result: Record<string, string | string[]> = {};

	if (entries === null) {
		return result;
	}

	// Consider setting atleast ES2015 as target
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	for (const [key, value] of entries) {
		// eslint-disable-next-line no-prototype-builtins
		if (result.hasOwnProperty(key)) {
			let currentValue = result[key];
			if (!Array.isArray(currentValue)) {
				currentValue = [currentValue];
			}
			currentValue.push(value);
			result[key] = currentValue;
		} else {
			result[key] = value;
		}
	}
	return result;
}
