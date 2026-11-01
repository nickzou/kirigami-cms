# Kirigami CMS

A markdown-first, configuration-first CMS for developers and non-developers.

- **Markdown is the content.** Plain, portable files with no CMS-specific syntax.
- **Configuration is the presentation.** Readable sidecar files, edited by hand or through the GUI.

Early development. Only the basics work so far: markdown pages are rendered to styled static HTML. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and [`docs/adr/`](docs/adr/) for the stack decisions.

## Usage

A site is a folder of markdown files, with an optional `site.yaml` for styling:

```
my-site/
├── site.yaml      # optional: colors, fonts, type scale, spacing, width
├── index.md       # -> index.html
├── about.md       # -> about/index.html
└── blog/
    └── hello.md   # -> blog/hello/index.html
```

A project can say where its content is in a `kirigami.config.yaml` in its root, so that `kirigami dev`, `build` and `check` need no folder (see [`schema/project.schema.json`](schema/project.schema.json) for editor autocomplete, and [ADR 0014](docs/adr/0014-project-configuration.md)):

```yaml
content:
  store: local-folder   # the only store so far
  path: ./content       # default
build:
  out: ./dist           # default
```

A folder given on the command line wins over it, and with neither, `./content` is used. [`kirigami.config.example.yaml`](kirigami.config.example.yaml) is a commented template to copy.

```sh
pnpm build
node dist/cli/main.js build my-site     # writes my-site/dist
node dist/cli/main.js build             # the content kirigami.config.yaml names, or ./content
node dist/cli/main.js check my-site     # validates without building
node dist/cli/main.js dev my-site       # (--host <address> to listen beyond this machine) preview at http://localhost:3000, reloads the browser when you save; admin at /admin, JSON API at /api (OpenAPI: /api/openapi.json)
```

The admin has a **Settings** screen that edits the theme in `site.yaml` with a live preview, keeping the file's comments ([ADR 0015](docs/adr/0015-settings-form-from-the-schema.md)).

Raw HTML in markdown is left out of the output. See [`test/fixtures/basic-site`](test/fixtures/basic-site) for an example, and [`schema/site.schema.json`](schema/site.schema.json) for editor autocomplete in `site.yaml`.

### In a container

The quickest way to try it, with only Docker installed (no Node or pnpm): put your markdown in `./content` (it is made if it is not there), then

```sh
docker compose up
```

and open <http://localhost:3000/admin/>. Ctrl+C stops it; `docker compose up --build` picks up an update after a `git pull`.

The same thing by hand: the `Dockerfile` runs `kirigami dev` (the admin with its live preview) on the markdown folder mounted at `/content`:

```sh
docker build -t kirigami .
docker run --rm -p 127.0.0.1:3000:3000 -v "$PWD/my-site:/content" kirigami
```

Then open <http://localhost:3000/admin/>. The container runs as the `node` user (uid 1000), which needs to be able to write to the mounted folder; add `--user "$(id -u):$(id -g)"` if it is owned by someone else. There is **no sign-in yet**, so publish the port to your own machine only, as above, and do not expose it to a network. Inside the container the server listens on every address (`kirigami dev --host 0.0.0.0`), which is how the published port reaches it; by default `kirigami dev` listens on this machine only.

## License

[MIT](LICENSE)

## Third-party

The admin ships the [Amiko](https://fonts.google.com/specimen/Amiko) font, served from the app itself rather than a CDN, under the SIL Open Font License 1.1. The license is included at `/admin/Amiko-OFL.txt`.
