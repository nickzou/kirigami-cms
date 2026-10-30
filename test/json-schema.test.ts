import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { z } from "zod";
import { projectConfigSchema, siteConfigSchema } from "../src/core/index.js";

it.each([
  ["site.schema.json", siteConfigSchema],
  ["project.schema.json", projectConfigSchema],
])(
  "schema/%s is up to date (run `pnpm schema` to regenerate)",
  async (file, schema) => {
    const committed = await readFile(
      new URL(`../schema/${file}`, import.meta.url),
      "utf8",
    );
    const expected = `${JSON.stringify(z.toJSONSchema(schema, { io: "input" }), null, 2)}\n`;
    expect(committed).toBe(expected);
  },
);
