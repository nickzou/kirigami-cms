# 0014: Project configuration file

Status: accepted

## Decision

A project says where its content comes from in **`kirigami.config.yaml`**, in the project root. It is YAML with a Zod schema ([0010](0010-yaml-config-files.md), [0004](0004-zod-as-the-config-schema.md)), and JSON Schema is generated for it into `schema/project.schema.json` (`pnpm schema`).

```yaml
content:
  store: local-folder   # the only store so far
  path: ./content       # relative to this file (the default)
build:
  out: ./dist           # where `kirigami build` writes, relative to this file (the default)
```

Every field is optional; an empty file means the defaults above.

- **Finding it.** The CLI looks in the current folder and then in each folder above it, so `kirigami dev` works from anywhere inside the project. Relative paths in the file are relative to the file, not to where the command was run.
- **Precedence.** A site folder on the command line wins over the config, and then behaves as it always has: the build goes to `<site>/dist` unless `--out` says otherwise. With no folder and no config file, the content is `./content`. `--out` overrides `build.out`, resolved from the working directory.
- **The commands.** `kirigami dev`, `build` and `check` all resolve the content the same way, and say where it came from when it was not named on the command line. `dev` makes the folder if it was chosen by the config (or the default) and does not exist yet, since the admin creates the first page in it. A folder named on the command line that is missing is not made.
- **A union on `store`.** `content` is a discriminated union, so another source (Google Drive, S3, Git) is another member with its own options, and nothing else in the file changes. An unknown or missing `store` is an error that says which ones exist. `openContent` (in `src/stores`) is the one place that turns a `content` setting into a store; a switch with a `never` check there means adding a store member makes the compiler point at where each caller needs to handle it.
- **Credentials are never written in the file.** A store that needs them (Google Drive) will reference them, by an environment variable or a file outside the project, so the project file is safe to commit. How, is decided when the first such store is built.

## Why

The content used to be whatever folder was passed on the command line, which does not let content live beside the code, and gives other content sources nowhere to be configured. A project file that is found automatically makes the common case a bare `kirigami dev`, and a union on `store` means a new source is a configuration choice and not a new command.

It cannot live in the content, because it says where the content is, so it is separate from `site.yaml` (the styling), which stays in the content store and travels with it.

## Consequences

- `pnpm dev` uses the config when the project root has one, and a git-ignored copy of the test fixture (`.dev-site/`) when it does not.
- This repository is the Kirigami code itself, so it ignores its own `kirigami.config.yaml` and `content/` (a developer's local choice, like a `.env` file) and commits `kirigami.config.example.yaml` as the template. A project that uses Kirigami commits its config, which holds no secrets.
- `schema/*.schema.json` are generated files and are excluded from the formatter, since a test compares them byte for byte with the generator's output.
- Watching for changes still assumes a local folder (see [0008](0008-content-store-interface.md)); a store that is not a folder will need its own way of telling the dev server something changed.

## Considered

A per-user file (`~/.config/kirigami/`) for machine-wide settings was left for later: it can be added without changing the project file, and it is where credentials may end up living. Putting the setting in `package.json` was rejected, because a project does not have to be a Node package.
