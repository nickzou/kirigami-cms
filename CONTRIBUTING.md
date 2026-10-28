# Contributing

These rules apply to everyone who changes this repo, human or agent. Stack decisions are recorded in [`docs/adr/`](docs/adr/).

## Principles

Three principles are fixed. Everything else can change.

1. **Developer- and non-developer-friendly.** Both audiences are first-class.
2. **Markdown/content-first.** Content is plain, portable markdown with no CMS-specific syntax. Presentation goes in sidecar config files, never inline in content.
3. **Configuration-first.** Presentation and behaviour live in readable config files. The GUI edits that config; it is never the only way to change something.

## Workflow

Development is trunk-based. `main` is always releasable, and nothing is pushed to it directly.

1. Create a short-lived branch off an up-to-date `main`.
2. Make small commits using Conventional Commits.
3. Open a PR. CI must pass.
4. The PR is squash-merged and the branch is deleted.

### Branch names

`<type>/<clickup-id>-<short-slug>`, for example `feat/86abc12-content-store`. The type is a Conventional Commits type. Branches with no ticket skip the ID: `chore/gitignore-additions`.

### Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`, with an optional scope such as `feat(core):`. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.

### Pull requests

- The PR title is a Conventional Commit message, because it becomes the squash commit on `main`.
- Keep PRs small and focused on one change.
- Link the ClickUp ticket in the description when there is one.

### Merging

Squash-merge only, then delete the branch. The maintainer merges.

## Code rules

- `src/core` must not import Node builtins or anything from `src/server`, `src/cli`, or `admin`. CI enforces this.
- Don't add syntax extensions to markdown content (directives, MDX, shortcodes, inline layout comments).
- Zod schemas are the source of truth for config and API shapes.
- Tests: Vitest. Don't mock the file system; use in-memory stores in unit tests.

## Issues

Issues are tracked in the project's issue tracker (currently ClickUp). See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).
