## Agent skills

### Issue tracker

Issues are tracked in the project's issue tracker (currently ClickUp, via MCP). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary, applied as tracker tags. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Development workflow

Full rules are in `CONTRIBUTING.md`; stack decisions are in `docs/adr/`.

- Trunk-based. Never commit or push to `main`. Work on a feature branch (a git worktree for parallel work) named `<type>/<clickup-id>-<slug>`, or `<type>/<slug>` when there is no ticket.
- Commits and PR titles use Conventional Commits.
- Open a PR for every change. Never merge it yourself: the maintainer merges (squash).
- Never force-push or rewrite shared history. Never skip hooks or CI.
- `src/core` must not import Node builtins or `src/server`, `src/cli`, `admin`.
- No CMS-specific syntax in markdown content. Presentation goes in sidecar config.
