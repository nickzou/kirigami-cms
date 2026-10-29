# 0012: UnoCSS for the admin styles

Status: accepted

## Decision

The admin is styled with UnoCSS (`presetWind3`), configured in `uno.config.ts`. Components write utilities in class strings that start with `:uno:`, for example `className=":uno: flex gap-2 p-4"`. UnoCSS's compile-class transformer turns each group into one hashed class (`uno-1a2b3c`) at build time.

Colors, radii and shadows are CSS variables, defined for light and dark in `admin/src/styles.css` and named in the UnoCSS theme. Utilities use the names (`bg-surface`, `text-muted`, `border-line`), so one set of classes serves both themes. `styles.css` holds only those variables and the base rules (body, headings, links, focus ring).

Class strings must be complete and literal so UnoCSS can find them. Variants are chosen from a lookup of full strings (see `Button.tsx`), not by joining fragments.

## Why

Utilities keep a component's styling beside its markup, which suits small presentational components with stories. Hashing keeps the output short and keeps the admin's classes from colliding with anything else on the page. The theme as CSS variables keeps dark mode and later theming in one place.

## Considered

Hashing every generated utility (more custom code, harder to debug), and plain unhashed utilities (no collision protection).
