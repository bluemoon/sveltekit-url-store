# sveltekit-url-store

A simple zod-based url store for SvelteKit.

# Shared Schema

It is possible to share the schema between the frontend and the backend. We do this by creating a `schema.ts` file.

```ts,schema.ts
import { queryStringArray } from "@/utils/url";
import { z } from "zod";

export const schema = z.object({
	filter: z.string().optional(),
	company_ids: queryStringArray.optional()
});
```

## Server side

```ts
import type { PageServerLoad } from './$types';
import { typedParams } from 'sveltekit-url-store';

export const load = (async ({ locals, url }) => {
	const { data } = typedParams(url.searchParams, schema);
}) satisfies PageServerLoad;
```

## Client side

```svelte
<script lang="ts">
	import { schema } from './query-params-schema';
	import { createURLStore } from 'sveltekit-url-store';

	let urlParams = createURLStore($page.url.searchParams, schema);

	// set as it updates
	$: urlParams.setFrom($page.url.searchParams);

	// subscribe to all changes to the url params and update the url
	urlParams.url.subscribe((newURL) => {
		if (browser) goto(`?${newURL}`);
	});
</script>
```
