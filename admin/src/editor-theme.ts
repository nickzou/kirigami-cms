import {
  HEADING_LEVELS,
  headingStyle,
  themeVariables,
} from "../../src/core/config/css.js";
import type { Theme } from "../../src/core/config/schema.js";
import { buildTheme, siteSections } from "./settings-schema.js";

/** The site's theme with nothing set: what a site with no `site.yaml` looks like. */
export const defaultTheme = (): Theme => buildTheme(siteSections, new Map());

/**
 * The CSS custom properties that make the editor's page look like the site:
 * the site's own `--k-*` tokens, and each heading's size and weight, worked
 * out the way the stylesheet works them out.
 */
export function editorVariables(theme: Theme): Record<string, string> {
  const variables = themeVariables(theme);
  for (const level of HEADING_LEVELS) {
    const { fontSize, fontWeight } = headingStyle(theme, level);
    variables[`--kcm-${level}-size`] = fontSize;
    variables[`--kcm-${level}-weight`] = String(fontWeight);
  }
  return variables;
}
