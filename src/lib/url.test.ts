import { createURLStore } from "$lib/index.js";
import { test } from "vitest";
import { z } from 'zod'

test("test", () => {
  const store = createURLStore(new URLSearchParams(), z.object({
    a: z.string()
  }))
})
