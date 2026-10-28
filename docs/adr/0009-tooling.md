# 0009: Tooling

Status: accepted

## Decision

- **pnpm** is the package manager.
- **Vitest** is the test framework. `core` is unit-tested on plain strings and in-memory stores, with a few integration tests against the real file-backed store. The file system is not mocked.
- **Biome** handles linting and formatting.
- **dependency-cruiser** enforces the `core` import boundary ([0002](0002-single-package-with-enforced-boundaries.md)).
- **GitHub Actions** runs typecheck, lint, test, build, and the boundary check on every PR.
- **Distribution:** a Docker image (multi-stage, Node LTS slim), `npx kirigami`, and static export. Docker image publishing to GHCR comes later.

## Notes

- **TypeScript is pinned to 6.x.** dependency-cruiser does not support TypeScript 7 yet. With 7 installed it cruises zero modules and reports no violations, so the boundary check silently does nothing. Move to 7 only once dependency-cruiser supports it, and confirm the check still fails on a deliberate violation.
- **`pnpm check`** runs the full CI sequence locally (typecheck, lint, test, build, boundaries). It is not named `ci` because that is a built-in pnpm command.
