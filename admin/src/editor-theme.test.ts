import { describe, expect, it } from "vitest";
import { defaultTheme, editorVariables } from "./editor-theme.js";
import { buildTheme, siteSections } from "./settings-schema.js";

describe("editorVariables", () => {
  it("carries the site's tokens and each heading's size and weight", () => {
    const variables = editorVariables(defaultTheme());
    expect(variables["--k-font-body"]).toBeDefined();
    expect(variables["--k-color-background"]).toBeDefined();
    for (const level of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
      expect(variables[`--kcm-${level}-size`]).toMatch(/\S/);
      expect(variables[`--kcm-${level}-weight`]).toMatch(/^\d{3}$/);
    }
  });

  it("follows what the site sets", () => {
    const theme = buildTheme(
      siteSections,
      new Map<string, string | number>([
        ["theme/colors/background", "#101010"],
        ["theme/headings/h2/size", "3rem"],
        ["theme/headings/h2/weight", 500],
      ]),
    );
    const variables = editorVariables(theme);
    expect(variables["--k-color-background"]).toBe("#101010");
    expect(variables["--kcm-h2-size"]).toBe("3rem");
    expect(variables["--kcm-h2-weight"]).toBe("500");
  });

  it("is the same maths the stylesheet uses for heading sizes", () => {
    const variables = editorVariables(defaultTheme());
    expect(variables["--kcm-h1-size"]).toMatch(
      /^calc\(var\(--k-font-size\) \* /,
    );
  });
});
