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

## Working on the admin

The admin app (React 19 + Vite) lives in `admin/` and is built into `dist/admin` by `pnpm build`. `kirigami dev` serves it at `/admin`.

To work on it with hot reloading, run a site in one terminal and Vite in another:

```sh
node dist/cli/main.js dev path/to/my-site   # serves the API on port 3000
pnpm admin:dev                              # admin on http://localhost:5173/admin/, proxying /api
```

If the site runs on another port, set `KIRIGAMI_DEV_URL` (for example `KIRIGAMI_DEV_URL=http://localhost:4000 pnpm admin:dev`). The admin imports only types from `src/server/api-schemas.ts`, so its request and response shapes cannot drift from the API.

### Styling

The admin uses UnoCSS (see ADR 0012). Write utilities in a class string that starts with `:uno:`; the build hashes each group into one class. Use the theme names from `uno.config.ts` (`bg-surface`, `text-muted`, `border-line`, `bg-accent`) rather than raw colors, so light and dark both work. Keep class strings literal and complete; choose between variants from a lookup of whole strings. Edit colors in `admin/src/styles.css`.

### Storybook

Every admin component has stories, so each state (loading, empty, error, conflict, and so on) can be seen and checked for accessibility in isolation.

```sh
pnpm storybook         # http://localhost:6006
pnpm build:storybook   # what CI runs
```

- `admin/src/components`: presentational components. Props in, markup out; no fetching, no app state. Each has a `*.stories.tsx` next to it.
- `admin/src/*.tsx` screens (`PageList`, `Editor`) fetch data and hold state; logic that is more than a few lines lives in `admin/src/hooks`.
- Screen stories use `installFakeApi` from `admin/src/fake-api.ts`, which runs the real pages API over an in-memory store. Use `failures` there to make it misbehave.
- `admin/src/stories.test.tsx` renders every story (including `play` functions) as part of `pnpm test`. Add a story when you add a component or a state.

See [ADR 0011](docs/adr/0011-storybook-for-the-admin.md).

## Issues

Issues are tracked in the project's issue tracker (currently ClickUp). See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).
