import siteSchema from "../../schema/site.schema.json";
import type { Theme } from "../../src/core/config/schema.js";
import { fontStackProblem } from "../../src/core/config/validate.js";

// The settings form is built from the generated JSON Schema of `site.yaml`
// (schema/site.schema.json, which a test keeps up to date), so a new setting in
// the schema appears here without touching the form. Each setting's metadata
// says how to show it (`widget`); the rest is title, description and limits.

export type Widget = "color" | "length" | "font" | "number";

export interface SettingField {
  /** The setting's place in the file, joined: `theme/colors/link`. */
  key: string;
  /** The same, as keys from the top of the file. */
  path: string[];
  title: string;
  description: string;
  widget: Widget;
  default: string | number;
  min?: number;
  max?: number;
  /** For colors and lengths: the regular expression a value must match. */
  pattern?: string;
}

export interface SettingsSection {
  key: string;
  path: string[];
  title: string;
  description: string;
  fields: SettingField[];
}

interface SchemaNode {
  type?: string;
  title?: string;
  description?: string;
  widget?: Widget;
  default?: unknown;
  properties?: Record<string, SchemaNode>;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

const WIDGETS: readonly string[] = ["color", "length", "font", "number"];

function toField(name: string, path: string[], node: SchemaNode): SettingField {
  const key = path.join("/");
  if (!node.widget || !WIDGETS.includes(node.widget)) {
    throw new Error(`The setting ${key} has no widget hint in the schema.`);
  }
  if (typeof node.default !== "string" && typeof node.default !== "number") {
    throw new Error(`The setting ${key} has no default in the schema.`);
  }
  return {
    key,
    path,
    title: node.title ?? name,
    description: node.description ?? "",
    widget: node.widget,
    default: node.default,
    ...(node.minimum !== undefined && { min: node.minimum }),
    ...(node.maximum !== undefined && { max: node.maximum }),
    ...(node.pattern !== undefined && { pattern: node.pattern }),
  };
}

/**
 * The sections of a settings form: every object in the schema whose children
 * are all single settings, in the order the schema lists them.
 */
export function buildSections(
  node: SchemaNode,
  path: string[] = [],
): SettingsSection[] {
  const children = Object.entries(node.properties ?? {});
  if (children.length === 0) return [];
  if (children.every(([, child]) => child.properties === undefined)) {
    return [
      {
        key: path.join("/"),
        path,
        title: node.title ?? path[path.length - 1] ?? "",
        description: node.description ?? "",
        fields: children.map(([name, child]) =>
          toField(name, [...path, name], child),
        ),
      },
    ];
  }
  return children.flatMap(([name, child]) =>
    buildSections(child, [...path, name]),
  );
}

/** The sections of the site settings (the theme). */
export const siteSections: readonly SettingsSection[] = buildSections(
  siteSchema as SchemaNode,
);

const COLOR_MESSAGE =
  "Enter a color such as #1a1a1a, rgb(26 26 26), or a color name.";
const LENGTH_MESSAGE =
  "Enter a length with a unit, such as 1rem, 18px, or 40ch.";

/** Why `raw` cannot be this setting's value, or `undefined` if it can. */
export function fieldProblem(
  field: SettingField,
  raw: string,
): string | undefined {
  const value = raw.trim();
  switch (field.widget) {
    case "color":
    case "length": {
      const message = field.widget === "color" ? COLOR_MESSAGE : LENGTH_MESSAGE;
      return field.pattern && new RegExp(field.pattern).test(value)
        ? undefined
        : message;
    }
    case "font":
      return fontStackProblem(value);
    case "number": {
      const number = Number(value);
      if (value === "" || Number.isNaN(number)) return "Enter a number.";
      const { min, max } = field;
      if (
        (min !== undefined && number < min) ||
        (max !== undefined && number > max)
      ) {
        return `Enter a number from ${min} to ${max}.`;
      }
      return undefined;
    }
  }
}

/** The value to store for text typed into a field (numbers as numbers). */
export const parseFieldValue = (
  field: SettingField,
  raw: string,
): string | number =>
  field.widget === "number" ? Number(raw.trim()) : raw.trim();

const valueAt = (data: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (node, key) =>
      node !== null && typeof node === "object"
        ? (node as Record<string, unknown>)[key]
        : undefined,
    data,
  );

/** The settings a file sets, from its parsed values, as `key -> value`. */
export function explicitValues(
  sections: readonly SettingsSection[],
  data: unknown,
): Map<string, string | number> {
  const values = new Map<string, string | number>();
  for (const field of sections.flatMap((section) => section.fields)) {
    const value = valueAt(data, field.path);
    if (typeof value === "string" || typeof value === "number") {
      values.set(field.key, value);
    }
  }
  return values;
}

/**
 * The whole theme for these settings: each field's default, unless the
 * `overrides` hold a valid value for it. Invalid values are left out, so the
 * preview never builds a stylesheet from something the build would refuse.
 */
export function buildTheme(
  sections: readonly SettingsSection[],
  overrides: ReadonlyMap<string, string | number>,
): Theme {
  const theme: Record<string, unknown> = {};
  for (const field of sections.flatMap((section) => section.fields)) {
    const override = overrides.get(field.key);
    const usable =
      override !== undefined &&
      fieldProblem(field, String(override)) === undefined;
    let node = theme;
    for (const key of field.path.slice(1, -1)) {
      const next = (node[key] ?? {}) as Record<string, unknown>;
      node[key] = next;
      node = next;
    }
    node[field.path[field.path.length - 1] as string] = usable
      ? override
      : field.default;
  }
  return theme as unknown as Theme;
}
