import { createURLStore, queryStringArray } from '$lib/index.js';
import { get } from 'svelte/store';
import { expect, test } from 'vitest';
import { z } from 'zod';

test('test basics', () => {
	const schema = z.object({
		a: z.string().optional(),
		// TODO: might be worth providing a type for this?
		b: z.preprocess((a) => Number(z.string().parse(a)), z.number()).optional(),
		c: queryStringArray.optional()
	});

	const data = { a: 'a', b: 1, c: ['c1', 'c2'] };
	const store = createURLStore(new URLSearchParams(), schema);

	store.set(data);
	expect(get(store.url)).toEqual('a=a&b=1&c=c1%2Cc2');

	const newStore = createURLStore(new URLSearchParams('a=a&b=1&c=c1%2Cc2'), schema);
	expect(get(newStore)).toEqual(data);
});

test('test remove key with undefined', () => {
	const schema = z.object({
		a: z.string().optional(),
		b: z.preprocess((a) => Number(z.string().parse(a)), z.number()).optional(),
		c: queryStringArray.optional()
	});

	const store = createURLStore(new URLSearchParams('a=a&b=1&c=c1%2Cc2'), schema);

	store.set({ a: 'a', b: 1, c: undefined });
	expect(get(store.url)).toEqual('a=a&b=1');
});
