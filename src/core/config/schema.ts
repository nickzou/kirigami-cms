import { z } from "zod";

/*
 * Values from the config end up inside a generated stylesheet, so each one is
 * checked to be a single CSS value that cannot end its declaration, open a
 * block, close a <style> tag, or pull in another resource.
 */

const hasNoBreakout = (value: string) =>
  !/[;{}<>\\]/.test(value) && !value.includes("/*");

const COLOR =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([0-9a-zA-Z\s,./%+-]*\))$/;

const LENGTH = /^(\d+|\d*\.\d+)(px|rem|em|ch|vw|%)$/;

const color = (fallback: string) =>
  z
    .string()
    .regex(
      COLOR,
      "Expected a color such as #1a1a1a, rgb(26 26 26), or a color name",
    )
    .default(fallback);

const length = (fallback: string) =>
  z
    .string()
    .regex(LENGTH, "Expected a length with a unit, such as 1rem, 18px, or 40ch")
    .default(fallback);

const fontStack = (fallback: string) =>
  z
    .string()
    .min(1)
    .refine(
      hasNoBreakout,
      "Must be a font-family list without ; { } < > \\ or comments",
    )
    .default(fallback);

const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const colors = z
  .strictObject({
    background: color("#ffffff"),
    text: color("#1a1a1a"),
    muted: color("#5c5c5c"),
    link: color("#0b57d0"),
    border: color("#d9d9d9"),
    codeBackground: color("#f4f4f5"),
  })
  .prefault({});

const fonts = z
  .strictObject({
    body: fontStack(SYSTEM_SANS),
    heading: fontStack("inherit"),
    mono: fontStack(SYSTEM_MONO),
  })
  .prefault({});

const type = z
  .strictObject({
    baseSize: length("1.125rem"),
    /** Ratio between heading levels, e.g. 1.25 is a "major third". */
    scale: z.number().min(1).max(2).default(1.25),
    lineHeight: z.number().min(1).max(3).default(1.6),
  })
  .prefault({});

const spacing = z.strictObject({ unit: length("1rem") }).prefault({});

const layout = z.strictObject({ maxWidth: length("44rem") }).prefault({});

export const themeSchema = z
  .strictObject({ colors, fonts, type, spacing, layout })
  .prefault({});

/** The contents of `site.yaml`. Every field is optional. */
export const siteConfigSchema = z
  .strictObject({ theme: themeSchema })
  .prefault({});

export type Theme = z.output<typeof themeSchema>;
export type SiteConfig = z.output<typeof siteConfigSchema>;
