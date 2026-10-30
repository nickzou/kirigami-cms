// Writes schema/site.schema.json and schema/project.schema.json from the Zod
// schemas. Run `pnpm schema`. Editors use them for autocomplete and validation
// in site.yaml and kirigami.config.yaml.
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { projectConfigSchema, siteConfigSchema } from "../dist/core/index.js";

await mkdir(new URL("../schema/", import.meta.url), { recursive: true });
for (const [file, schema] of [
  ["site.schema.json", siteConfigSchema],
  ["project.schema.json", projectConfigSchema],
]) {
  await writeFile(
    new URL(`../schema/${file}`, import.meta.url),
    `${JSON.stringify(z.toJSONSchema(schema, { io: "input" }), null, 2)}\n`,
  );
}
