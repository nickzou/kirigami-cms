# 0009: Tooling

Status: accepted

## Decision

- **pnpm** is the package manager.
- **Vitest** is the test framework. `core` is unit-tested on plain strings and in-memory stores, with a few integration tests against the real file-backed store. The file system is not mocked.
- **Biome** handles linting and formatting.
- **dependency-cruiser** enforces the `core` import boundary ([0002](0002-single-package-with-enforced-boundaries.md)).
- **GitHub Actions** runs typecheck, lint, test, build, and the boundary check on every PR.
- **Distribution:** a Docker image (multi-stage, Node LTS slim), `npx kirigami`, and static export. Docker image publishing to GHCR comes later.
