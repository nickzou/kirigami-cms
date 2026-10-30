import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { defaultProjectConfig, parseProjectConfig } from "../src/core/index.js";

it("kirigami.config.example.yaml is valid and shows the defaults", async () => {
  const file = new URL("../kirigami.config.example.yaml", import.meta.url);
  const config = parseProjectConfig(await readFile(file, "utf8"), "example");
  expect(config).toEqual(defaultProjectConfig);
});

it("the example points editors at a schema file that exists", async () => {
  const text = await readFile(
    new URL("../kirigami.config.example.yaml", import.meta.url),
    "utf8",
  );
  const path = /\$schema=(\S+)/.exec(text)?.[1];
  expect(path).toBe("./schema/project.schema.json");
  await expect(
    readFile(new URL(`../${path}`, import.meta.url), "utf8"),
  ).resolves.toContain("local-folder");
});
