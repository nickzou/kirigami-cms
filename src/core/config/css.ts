import type { Theme } from "./schema.js";

/** `scale ^ steps`, rounded to three decimals so output stays readable. */
const power = (scale: number, steps: number): number =>
  Math.round(scale ** steps * 1000) / 1000;

const size = (scale: number, steps: number): string =>
  `calc(var(--k-font-size) * ${power(scale, steps)})`;

/**
 * Generates the site stylesheet from the theme: every token becomes a CSS
 * variable on `:root`, and the element rules below use only those variables.
 */
export function generateStylesheet(theme: Theme): string {
  const { colors, fonts, type, spacing, layout } = theme;
  const s = type.scale;

  return `:root {
  --k-color-background: ${colors.background};
  --k-color-text: ${colors.text};
  --k-color-muted: ${colors.muted};
  --k-color-link: ${colors.link};
  --k-color-border: ${colors.border};
  --k-color-code-background: ${colors.codeBackground};
  --k-font-body: ${fonts.body};
  --k-font-heading: ${fonts.heading};
  --k-font-mono: ${fonts.mono};
  --k-font-size: ${type.baseSize};
  --k-line-height: ${type.lineHeight};
  --k-space: ${spacing.unit};
  --k-max-width: ${layout.maxWidth};
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--k-color-background);
  color: var(--k-color-text);
  font-family: var(--k-font-body);
  font-size: var(--k-font-size);
  line-height: var(--k-line-height);
}

main {
  max-width: var(--k-max-width);
  margin: 0 auto;
  padding: calc(var(--k-space) * 2) var(--k-space);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: calc(var(--k-space) * 2) 0 var(--k-space);
  font-family: var(--k-font-heading);
  line-height: 1.2;
}

h1 {
  margin-top: 0;
  font-size: ${size(s, 4)};
}

h2 {
  font-size: ${size(s, 3)};
}

h3 {
  font-size: ${size(s, 2)};
}

h4 {
  font-size: ${size(s, 1)};
}

h5 {
  font-size: ${size(s, 0)};
}

h6 {
  font-size: ${size(s, 0)};
  color: var(--k-color-muted);
}

p,
ul,
ol,
blockquote,
pre,
table {
  margin: 0 0 var(--k-space);
}

a {
  color: var(--k-color-link);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

a:hover {
  text-decoration-thickness: 2px;
}

ul,
ol {
  padding-left: calc(var(--k-space) * 1.5);
}

li {
  margin: calc(var(--k-space) * 0.25) 0;
}

li > ul,
li > ol {
  margin-bottom: 0;
}

input[type="checkbox"] {
  margin-right: 0.4em;
}

blockquote {
  padding: 0 var(--k-space);
  border-left: 4px solid var(--k-color-border);
  color: var(--k-color-muted);
}

blockquote > :last-child {
  margin-bottom: 0;
}

code {
  padding: 0.15em 0.35em;
  border-radius: 4px;
  background: var(--k-color-code-background);
  font-family: var(--k-font-mono);
  font-size: 0.9em;
}

pre {
  padding: var(--k-space);
  border-radius: 6px;
  background: var(--k-color-code-background);
  overflow-x: auto;
}

pre code {
  padding: 0;
  background: none;
  font-size: 0.875em;
}

hr {
  margin: calc(var(--k-space) * 2) 0;
  border: 0;
  border-top: 1px solid var(--k-color-border);
}

table {
  display: block;
  max-width: 100%;
  border-collapse: collapse;
  overflow-x: auto;
}

th,
td {
  padding: calc(var(--k-space) * 0.4) calc(var(--k-space) * 0.75);
  border: 1px solid var(--k-color-border);
  text-align: left;
}

th {
  background: var(--k-color-code-background);
}

img {
  max-width: 100%;
  height: auto;
}

del {
  color: var(--k-color-muted);
}

section.footnotes {
  margin-top: calc(var(--k-space) * 2);
  padding-top: var(--k-space);
  border-top: 1px solid var(--k-color-border);
  color: var(--k-color-muted);
  font-size: 0.875em;
}
`;
}
