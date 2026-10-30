import { describe, expect, it } from "vitest";
import { defaultSiteConfig, siteConfigSchema } from "../../src/core/index.js";
import {
  buildSections,
  buildTheme,
  explicitValues,
  fieldProblem,
  parseFieldValue,
  type SettingField,
  siteSections,
} from "./settings-schema.js";

const field = (key: string): SettingField => {
  const found = siteSections
    .flatMap((s) => s.fields)
    .find((f) => f.key === key);
  if (!found) throw new Error(`no field ${key}`);
  return found;
};

describe("siteSections", () => {
  it("has a section for each part of the theme, in the schema's order", () => {
    expect(siteSections.map((s) => s.title)).toEqual([
      "Colors",
      "Fonts",
      "Type",
      "Spacing",
      "Layout",
    ]);
  });

  it("has every setting in the schema, each with a title, description, widget and default", () => {
    const fields = siteSections.flatMap((s) => s.fields);
    expect(fields).toHaveLength(14);
    for (const f of fields) {
      expect(f.title, f.key).not.toBe("");
      expect(f.description, f.key).not.toBe("");
      expect(["color", "length", "font", "number"]).toContain(f.widget);
    }
  });

  it("has the same defaults as the schema that checks the file", () => {
    for (const f of siteSections.flatMap((s) => s.fields)) {
      const value = f.path.reduce<unknown>(
        (node, key) => (node as Record<string, unknown>)[key],
        defaultSiteConfig,
      );
      expect(f.default, f.key).toBe(value);
    }
  });

  it("knows the limits of a number", () => {
    expect(field("theme/type/scale")).toMatchObject({ min: 1, max: 2 });
    expect(field("theme/type/lineHeight")).toMatchObject({ min: 1, max: 3 });
  });

  it("refuses a setting that has no widget hint, so it cannot be left out by mistake", () => {
    expect(() =>
      buildSections({
        properties: { a: { type: "string", default: "x" } },
      }),
    ).toThrow(/no widget hint/);
  });
});

describe("fieldProblem agrees with the schema that checks the file", () => {
  const samples: Record<string, [valid: string[], invalid: string[]]> = {
    "theme/colors/link": [
      ["#fff", "#1a1a1a", "rgb(26 26 26)", "rebeccapurple", "hsl(200 50% 40%)"],
      ["", "not a color!", "#12", "red; x", "url(x)"],
    ],
    "theme/layout/maxWidth": [
      ["44rem", "70ch", "800px", "0.5em"],
      ["", "44", "wide", "44 rem", "calc(1px)"],
    ],
    "theme/fonts/body": [
      ['Georgia, "Times New Roman", serif', "system-ui"],
      ["", "a; color: red", "a { b", "a /* c */"],
    ],
    "theme/type/scale": [
      ["1", "1.25", "2"],
      ["0.9", "2.1", "abc", ""],
    ],
  };

  for (const [key, [valid, invalid]] of Object.entries(samples)) {
    const f = field(key);
    it(`${key}: accepts and refuses the same values as the schema`, () => {
      const accepted = (raw: string) => {
        const value = parseFieldValue(f, raw);
        const data = f.path.reduceRight<unknown>(
          (inner, k) => ({ [k]: inner }),
          value,
        );
        return siteConfigSchema.safeParse(data).success;
      };
      for (const raw of valid) {
        expect(fieldProblem(f, raw), `${raw} should be fine`).toBeUndefined();
        expect(accepted(raw), `${raw} by the schema`).toBe(true);
      }
      for (const raw of invalid) {
        expect(fieldProblem(f, raw), `${raw} should be refused`).toBeTypeOf(
          "string",
        );
        expect(accepted(raw), `${raw} by the schema`).toBe(false);
      }
    });
  }
});

describe("parseFieldValue", () => {
  it("makes a number a number and trims text", () => {
    expect(parseFieldValue(field("theme/type/scale"), " 1.5 ")).toBe(1.5);
    expect(parseFieldValue(field("theme/colors/link"), " #fff ")).toBe("#fff");
  });
});

describe("explicitValues", () => {
  it("picks the settings a file sets, by key, and ignores the rest", () => {
    const values = explicitValues(siteSections, {
      theme: { colors: { link: "#9c27b0" }, type: { scale: 1.5 } },
    });
    expect([...values]).toEqual([
      ["theme/colors/link", "#9c27b0"],
      ["theme/type/scale", 1.5],
    ]);
  });

  it("is empty for no data", () => {
    expect(explicitValues(siteSections, {}).size).toBe(0);
    expect(explicitValues(siteSections, null).size).toBe(0);
  });
});

describe("buildTheme", () => {
  it("is the defaults when nothing is set", () => {
    expect(buildTheme(siteSections, new Map())).toEqual(
      defaultSiteConfig.theme,
    );
  });

  it("uses a valid value over the default", () => {
    const theme = buildTheme(
      siteSections,
      new Map<string, string | number>([
        ["theme/colors/link", "#9c27b0"],
        ["theme/type/scale", 1.5],
      ]),
    );
    expect(theme.colors.link).toBe("#9c27b0");
    expect(theme.type.scale).toBe(1.5);
    expect(theme.colors.text).toBe(defaultSiteConfig.theme.colors.text);
  });

  it("leaves out an invalid value, so a stylesheet is never built from it", () => {
    const theme = buildTheme(
      siteSections,
      new Map<string, string | number>([["theme/colors/link", "red; x"]]),
    );
    expect(theme.colors.link).toBe(defaultSiteConfig.theme.colors.link);
  });

  it("is a theme the schema accepts", () => {
    const theme = buildTheme(
      siteSections,
      new Map<string, string | number>([["theme/layout/maxWidth", "60ch"]]),
    );
    expect(siteConfigSchema.safeParse({ theme }).success).toBe(true);
  });
});
