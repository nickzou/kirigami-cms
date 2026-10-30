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

/*
 * Each setting carries a `title`, a `description` and a `widget` hint in its
 * metadata. They flow into the generated JSON Schema, which is what the admin's
 * settings form is built from (and what editors show as tooltips), so a new
 * setting needs only its definition here.
 */
type Hint = { title: string; description: string };

const color = (fallback: string, hint: Hint) =>
  z
    .string()
    .regex(
      COLOR,
      "Expected a color such as #1a1a1a, rgb(26 26 26), or a color name",
    )
    .default(fallback)
    .meta({ ...hint, widget: "color" });

const length = (fallback: string, hint: Hint) =>
  z
    .string()
    .regex(LENGTH, "Expected a length with a unit, such as 1rem, 18px, or 40ch")
    .default(fallback)
    .meta({ ...hint, widget: "length" });

const fontStack = (fallback: string, hint: Hint) =>
  z
    .string()
    .min(1)
    .refine(
      hasNoBreakout,
      "Must be a font-family list without ; { } < > \\ or comments",
    )
    .default(fallback)
    .meta({ ...hint, widget: "font" });

const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const colors = z
  .strictObject({
    background: color("#ffffff", {
      title: "Background",
      description: "The page background.",
    }),
    text: color("#1a1a1a", {
      title: "Text",
      description: "Body text.",
    }),
    muted: color("#5c5c5c", {
      title: "Muted text",
      description: "Secondary text, such as captions and dates.",
    }),
    link: color("#0b57d0", {
      title: "Links",
      description: "The color of links.",
    }),
    border: color("#d9d9d9", {
      title: "Borders",
      description: "Lines and rules, such as table borders and dividers.",
    }),
    codeBackground: color("#f4f4f5", {
      title: "Code background",
      description: "Behind code blocks and inline code.",
    }),
  })
  .prefault({})
  .meta({ title: "Colors", description: "The palette of the site." });

const fonts = z
  .strictObject({
    body: fontStack(SYSTEM_SANS, {
      title: "Body font",
      description:
        'A font-family list, ending with a generic family, such as: Georgia, "Times New Roman", serif',
    }),
    heading: fontStack("inherit", {
      title: "Heading font",
      description:
        "A font-family list for headings, or inherit to use the body font.",
    }),
    mono: fontStack(SYSTEM_MONO, {
      title: "Code font",
      description: "A font-family list for code.",
    }),
  })
  .prefault({})
  .meta({
    title: "Fonts",
    description:
      "Font-family lists. Fonts already on the reader's device are used.",
  });

const type = z
  .strictObject({
    baseSize: length("1.125rem", {
      title: "Base size",
      description: "The size of body text, such as 1.125rem or 18px.",
    }),
    scale: z.number().min(1).max(2).default(1.25).meta({
      title: "Heading scale",
      description:
        'The ratio between heading levels, from 1 to 2. 1.25 is a "major third".',
      widget: "number",
    }),
    lineHeight: z.number().min(1).max(3).default(1.6).meta({
      title: "Line height",
      description: "The space between lines, as a multiple of the text size.",
      widget: "number",
    }),
  })
  .prefault({})
  .meta({ title: "Type", description: "The size and rhythm of text." });

const spacing = z
  .strictObject({
    unit: length("1rem", {
      title: "Spacing unit",
      description: "The basic gap. Margins and padding are multiples of it.",
    }),
  })
  .prefault({})
  .meta({
    title: "Spacing",
    description: "How much room there is around things.",
  });

const layout = z
  .strictObject({
    maxWidth: length("44rem", {
      title: "Content width",
      description: "The widest the text column gets, such as 44rem or 70ch.",
    }),
  })
  .prefault({})
  .meta({ title: "Layout", description: "The shape of the page." });

export const themeSchema = z
  .strictObject({ colors, fonts, type, spacing, layout })
  .prefault({})
  .meta({ title: "Theme", description: "How the site looks." });

/** The contents of `site.yaml`. Every field is optional. */
export const siteConfigSchema = z
  .strictObject({ theme: themeSchema })
  .prefault({});

export type Theme = z.output<typeof themeSchema>;
export type SiteConfig = z.output<typeof siteConfigSchema>;
