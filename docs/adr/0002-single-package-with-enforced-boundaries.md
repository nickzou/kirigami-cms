# 0002: Single package with enforced boundaries

Status: accepted

## Decision

The repo is one pnpm package, not a workspace. Source is organised as `src/core`, `src/server`, `src/cli`, and `admin/`.

`src/core` must not import Node builtins (`fs`, `node:*`, ...) or anything from `src/server`, `src/cli`, or `admin`. This is enforced by dependency-cruiser in CI. Biome's `noNodejsModules` rule is switched on for `src/core/**` as a second check.

## Why

Separate packages add workspace config, build ordering, and versioning overhead that a solo project with agents doesn't need. The part of that structure worth having is the boundary, so `core` stays testable on plain strings and can sit on any content store. Install experience for users is the same either way: Docker image, `npx kirigami`, or static export.

Biome's `noRestrictedImports` matches the import text, not the resolved file, so it can't reliably enforce the folder boundary on its own.

## Consequences

If `core` is later wanted as a standalone library, splitting it into its own package is a mechanical change.
