// Writes schema/site.schema.json from the Zod schema. Run `pnpm schema`.
// Editors use it for autocomplete and validation in site.yaml.
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { siteConfigSchema } from "../dist/core/index.js";

const schema = z.toJSONSchema(siteConfigSchema, { io: "input" });
await mkdir(new URL("../schema/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../schema/site.schema.json", import.meta.url),
  `${JSON.stringify(schema, null, 2)}\n`,
);
