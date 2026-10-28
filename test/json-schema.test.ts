import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { z } from "zod";
import { siteConfigSchema } from "../src/core/index.js";

it("schema/site.schema.json is up to date (run `pnpm schema` to regenerate)", async () => {
  const committed = await readFile(
    new URL("../schema/site.schema.json", import.meta.url),
    "utf8",
  );
  const expected = `${JSON.stringify(z.toJSONSchema(siteConfigSchema, { io: "input" }), null, 2)}\n`;
  expect(committed).toBe(expected);
});
