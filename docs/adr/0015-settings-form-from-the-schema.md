# 0015: A settings form built from the schema

Status: accepted

## Decision

The admin's **Settings** screen edits the theme in `site.yaml` with a form that is **built from the schema**, not written by hand, and previews the result **live, before saving**.

- **The schema describes its own form.** Every theme setting carries a `title`, a `description` and a `widget` hint (`color`, `length`, `font`, `number`) in its Zod metadata (`.meta(...)`), next to its default and limits. They flow into the generated `schema/site.schema.json`, which the admin imports (it never loads Zod), and which editors also show as tooltips. The form reads that file: every object whose children are single settings becomes a section. A setting with no widget hint makes `buildSections` throw, and a test checks the defaults in the file against the schema that checks `site.yaml`, so the form cannot drift from validation. A new setting needs only its definition in `src/core/config/schema.ts`.
- **One definition of each check.** The browser checks a value as it is typed. The rule for a font list lives in `src/core/config/validate.ts` (free of Zod, so the admin can import it) and is used by the schema too. Tests run the same valid and invalid examples through the form's checks and through the schema, and require them to agree.
- **Live preview, before saving.** The browser builds the stylesheet from the unsaved values with `generateStylesheet`, the same function the build uses, and puts it into a copy of a real page (the home page, else the first), fetched from the dev server, with its stylesheet link replaced. With no page, a sample page is used. The preview is a sandboxed `<iframe srcdoc>` with no scripts. A value that is not valid is never used in the preview, so it only ever shows what the build would accept. Nothing is written until Save.
- **Saving keeps the file as the author wrote it.** `GET /api/site-config` gives the file's text, version and the values it sets (before defaults); `PUT /api/site-config` takes a list of changes (a path and a value, or `null`) and the version last read. The server edits the YAML document (`editConfigText`), so comments, inline comments, key order and untouched values are kept. A new key goes at the end of its section. A key set back to its default (Reset, or an emptied field) is **removed**, and a section it leaves empty goes with it, so the file holds only what was chosen. The server validates the new text with the schema before writing, under the same version check as pages (a stale version is a 409 conflict, as for a page).
- **Theme only, for now.** The screen is built in sections so more can join. `kirigami.config.yaml` ([0014](0014-project-configuration.md)) stays hand-edited: it sits outside the content store, and changing the content folder would change what the admin itself is showing.
- **Layout.** From `lg` up the form and the preview sit side by side, the preview staying in view. Below that, the same fixed control as the page editor switches between them. Save is in the header and unsaved changes are guarded, as in the editor.

## Why

A settings form written by hand drifts from the schema the moment a setting is added, and the schema is already the source of truth ([0004](0004-zod-as-the-config-schema.md), [0010](0010-yaml-config-files.md)). Putting the labels and widget hints in the schema means one place to change, and the generated JSON Schema already exists for editors. Editing the document and not rewriting the data is what ADR 0010 promised: the file stays hand-editable, and a save changes only what you changed.

Previewing before saving needs no round trip and nothing in the file to undo, and because the stylesheet comes from the build's own function, what the preview shows is what the build makes.

## Consequences

- The admin imports `schema/site.schema.json` and `src/core/config/{css,validate}.ts`, not Zod; the admin bundle grew by about 14 KB.
- Colors can be any CSS color the schema accepts, so the color picker only sets `#rrggbb`; a typed name or `rgb()` is kept as typed.
- A `site.yaml` that is not valid cannot be edited in the form: the screen says why and the file is fixed by hand (or its text edited some other way).
- The preview borrows a real page through the dev server, so it shows a sample page when the admin runs without one (Storybook, an empty site).

## Considered

A hand-built form (nicer controls, but it drifts) and a fully generic form with plain text inputs (no color picker). Rewriting `site.yaml` from the data on every save was rejected: it loses comments. Previewing only after a save was rejected, since you could not try a value without writing it.
