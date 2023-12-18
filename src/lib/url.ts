import type { Readable, Writable } from "svelte/store";
import type { AnyZodObject, z, ZodEffects } from "zod";
import { fromEntriesWithDuplicateKeys } from "@/utils/url";
import { writable } from "svelte/store";

type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * This is a TypeScript type definition that unwraps a nested ZodEffects type until
 * it reaches an AnyZodObject or cannot be unwrapped further. Here's a breakdown:
 *
 * - `UnwrapEffects<T>`: This is a generic type that takes a type parameter T.
 * - `T extends ZodEffects<infer U>`: Checks if T is a subtype of ZodEffects. If this
 *   is true, it infers the type U that ZodEffects is wrapping.
 * - `UnwrapEffects<U>`: If the above condition is true, it recursively calls
 * 	 UnwrapEffects with the inferred type U. This will continue until T is no
 *   longer a ZodEffects type.
 * - `T extends AnyZodObject ? T` : If T is a subtype of AnyZodObject, it returns T.
 *   This is the base case of the recursion.
 * - `: never; `: If T is neither a ZodEffects nor AnyZodObject, it returns never, a type
 *  representing an unreachable code section.
 *
 * TL;DR it's a recursive type that peels off the ZodEffects layers until it gets to
 * an AnyZodObject or a type that's neither ZodEffects nor AnyZodObject. This is
 * useful in the Zod library (a TypeScript validation library) where you might have
 * nested effects that need to be resolved to their base types.
 */
export type UnwrapEffects<T> = T extends ZodEffects<infer U>
  ? UnwrapEffects<U>
  : T extends AnyZodObject
  ? T
  : never;

export type ZodValidation<T extends AnyZodObject> =
  | T
  | ZodEffects<T>
  | ZodEffects<ZodEffects<T>>
  | ZodEffects<ZodEffects<ZodEffects<T>>>
  | ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
  | ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>;

export type TypedParams<T extends ZodValidation<AnyZodObject>> = {
  data: z.infer<UnwrapEffects<T>>;

  from: (params: URLSearchParams) => z.infer<UnwrapEffects<T>>;
  setQuery: <J extends keyof z.TypeOf<UnwrapEffects<T>>>(
    key: J,
    value: T[J]
  ) => TypedParams<UnwrapEffects<T>>;
  toString(): string;
};

export function typedParams<T extends ZodValidation<AnyZodObject>>(
  params: URLSearchParams,
  schema: T
): TypedParams<UnwrapEffects<T>> {
  type Output = z.infer<UnwrapEffects<T>>;
  type FullOutput<Output> = Required<Output>;
  type OutputKeys<Output> = Required<keyof FullOutput<Output>>;

  const typed = {
    data: {},
    from(params: URLSearchParams) {
      const unparsedQuery = fromEntriesWithDuplicateKeys(
        params.entries() ?? null
      );
      const parsedQuerySchema = schema.safeParse(unparsedQuery);

      if (parsedQuerySchema.success) typed.data = parsedQuerySchema.data;
      else if (!parsedQuerySchema.success)
        console.error(parsedQuerySchema.error);
      return typed;
    },
    setQuery<J extends OutputKeys<Output>>(key: J, value: T[J]) {
      // Remove old value by key so we can merge new value
      const search = new URLSearchParams(typed.data);
      search.set(String(key), String(value));
      return typed.from(search);
    },
    toString() {
      const search = new URLSearchParams(typed.data);
      return search.toString();
    }
  };

  return typed.from(params);
}

export type TypedURLStore<T extends ZodValidation<AnyZodObject>> = Writable<
  z.infer<UnwrapEffects<T>>
> & {
  url: Readable<string>;

  setFrom(from: URLSearchParams): void;
  setQuery: <J extends keyof z.TypeOf<UnwrapEffects<T>>>(
    key: J,
    value: T[J]
  ) => void;
  removeByKey(key: OptionalKeys<z.TypeOf<T>>): void;
};

export function createURLStore<T extends ZodValidation<AnyZodObject>>(
  url: URLSearchParams,
  schema: T
): TypedURLStore<UnwrapEffects<T>> {
  type Output = z.infer<UnwrapEffects<T>>;
  type FullOutput<Output> = Required<Output>;
  type OutputKeys<Output> = Required<keyof FullOutput<Output>>;
  type OutputOptionalKeys<Output> = OptionalKeys<Output>;

  // TODO: make this a derived?
  const urlStore = writable("");
  const { subscribe, update, set } = writable<Output>(from(url));

  function from(params: URLSearchParams) {
    const unparsedQuery = fromEntriesWithDuplicateKeys(
      params.entries() ?? null
    );
    const parsedQuerySchema = schema.safeParse(unparsedQuery);
    let data: Output = {} as Output;

    if (parsedQuerySchema.success) data = parsedQuerySchema.data;
    else if (!parsedQuerySchema.success) console.error(parsedQuerySchema.error);

    return data;
  }

  return {
    subscribe,
    update,
    set,
    setFrom(params: URLSearchParams) {
      set(from(params));
    },
    setQuery<J extends OutputKeys<Output>>(key: J, value: T[J]) {
      update((state) => {
        // Remove old value by key so we can merge new value
        const search = new URLSearchParams(state);
        search.set(String(key), String(value));
        urlStore.set(search.toString());
        return from(search);
      });
    },
    removeByKey(key: OutputOptionalKeys<Output>) {
      update((state) => {
        const search = new URLSearchParams(state);
        search.delete(String(key));
        urlStore.set(search.toString());
        return from(search);
      });
    },
    url: urlStore
  };
}
