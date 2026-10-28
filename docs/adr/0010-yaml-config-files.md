# 0010: YAML for config files

Status: accepted

## Decision

Config files are YAML (1.2), read with the `yaml` library and validated with Zod ([0004](0004-zod-as-the-config-schema.md)). The site config is `site.yaml` at the site root; every field is optional and an empty or missing file means the defaults.

The Zod schemas validate plain objects, so they do not depend on the file format. One function, `parseSiteConfig(text, file)`, turns text into a validated object. Changing the format later means replacing that function only.

JSON Schema is generated from the Zod schema into `schema/site.schema.json` (`pnpm schema`; a test fails if the committed file is stale). Editors use it for autocomplete and validation by adding `# yaml-language-server: $schema=...` to the top of `site.yaml`.

## Why

Configuration is edited by hand as well as through the GUI, so comments matter, and the GUI must be able to rewrite a file without losing them. The `yaml` library can edit a document and keep its comments; JSON has neither comments nor that. YAML is also readable for nested token trees, where TOML gets verbose. Its usual pitfalls (indentation, values like `no` becoming `false`) are caught by the schema, which rejects wrong types and reports the file and field.

## Consequences

- Unknown keys are errors, naming the file and the full path (`theme.colours`). A typo is never silently ignored.
- Duplicate keys and syntax errors are errors, with the line number.
- CSS-valued fields are checked so a config value cannot end its declaration, open a block, close a `<style>` tag, or load another resource.
- A font list needs the whole value quoted if it also contains quotes: `heading: '"Helvetica Neue", sans-serif'`. Writing `"Helvetica Neue", sans-serif` is invalid YAML. The error points at the line ("Unexpected scalar at node end") but does not explain the fix, so the docs for the styling config should show this case.
- The JSON Schema cannot express the "no `;` `{` `}`" font check, so editors won't flag it; `kirigami check` will.

## Considered

JSON (the strongest editor support, but no comments) and TOML (good for flat settings, verbose for nested ones).
