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
node dist/cli/main.js dev my-site       # (--host <address> to listen beyond this machine, which needs KIRIGAMI_PASSWORD) preview at http://localhost:3000, reloads the browser when you save; admin at /admin, JSON API at /api (OpenAPI: /api/openapi.json)
```

### Writing in the admin

The page editor shows your markdown formatted, in the site's own theme (fonts, sizes, colors, content width), and never shows the marks (`**`, `#`, `[…](…)`): bold looks bold, a heading looks like a heading, and a link shows only its text. Tables, images and task boxes are drawn as what they are (a table shows its markdown while the cursor is in it). It never changes a character you did not type: what you see is plain markdown, and what is saved is exactly that ([ADR 0006](docs/adr/0006-react-and-vite-for-the-admin.md)).

A small toolbar adds the usual marks to the selection (bold, italic, heading, link, bulleted list, code; it is one Tab stop, and the arrow keys move along it). **Cmd/Ctrl+B**, **I** and **K** do bold, italic and a link, **Cmd/Ctrl+S** saves, and **Enter** at the end of a list item or quote starts the next one (twice ends the list). **Tab** moves focus out of the text rather than indenting. **Cmd/Ctrl-click** opens a link in a new tab. A link's address lives in a small popover under it (the cursor in the link brings it up; it fades while you type, **Escape** closes it, **Cmd/Ctrl+K** moves into it), with Open, Remove link and Save (which, like Enter, closes it and puts you back in the text). With the marks out of sight, the arrow keys step over a hidden mark as one stop (so one press of an arrow can look like nothing happened), Backspace next to one steps in front of it instead of deleting it, and Backspace at the start of a heading or quote turns it back into a paragraph. Tables are edited as markdown for now: click one, or arrow onto it. An image shows if its address is a web one (`https://…`); a file next to the page cannot be served yet, so it shows a note instead.

The admin has a **Settings** screen that edits the theme in `site.yaml` with a live preview, keeping the file's comments ([ADR 0015](docs/adr/0015-settings-form-from-the-schema.md)).

Raw HTML in markdown is left out of the output. See [`test/fixtures/basic-site`](test/fixtures/basic-site) for an example, and [`schema/site.schema.json`](schema/site.schema.json) for editor autocomplete in `site.yaml`.

### In a container

The quickest way to try it, with only Docker installed (no Node or pnpm): put your markdown in `./content` (it is made if it is not there), choose a password for the admin, then

```sh
cp .env.example .env     # then open .env and set KIRIGAMI_PASSWORD (at least 8 characters)
docker compose up
```

and open <http://localhost:3000/admin/>, which asks for that password. Ctrl+C stops it; `docker compose up --build` picks up an update after a `git pull`.

The same thing by hand: the `Dockerfile` runs `kirigami dev` (the admin with its live preview) on the markdown folder mounted at `/content`:

```sh
docker build -t kirigami .
docker run --rm -p 127.0.0.1:3000:3000 -e KIRIGAMI_PASSWORD=choose-a-password -v "$PWD/my-site:/content" kirigami
```

Then open <http://localhost:3000/admin/>. The container runs as the `node` user (uid 1000), which needs to be able to write to the mounted folder; add `--user "$(id -u):$(id -g)"` if it is owned by someone else. Inside the container the server listens on every address (`kirigami dev --host 0.0.0.0`), which is how the published port reaches it, so it refuses to start without `KIRIGAMI_PASSWORD`.

### Signing in

Set `KIRIGAMI_PASSWORD` (at least 8 characters) in the environment where Kirigami runs and the admin and the API ask for it. It is one password for the whole site; there are no user accounts yet. It is only ever read from the environment, never from `kirigami.config.yaml`.

- **On this machine** (`kirigami dev` with no `--host`), nothing is asked unless you set the password.
- **Beyond this machine** (`--host 0.0.0.0` and the like), `kirigami dev` refuses to start without it.
- **The built site is public.** Only the admin and the API (`/api`, and the live-reload stream) are behind the password. The admin's own files are public too; they hold no content.
- **Scripts** can send `Authorization: Bearer <the password>` instead of signing in.
- **Use HTTPS beyond a network you trust.** Kirigami speaks plain HTTP; put a proxy that terminates HTTPS in front of it (the session cookie is marked `Secure` when the request came over HTTPS or the proxy sends `X-Forwarded-Proto: https`).
- **Wrong guesses are not slowed down yet**, so choose a password that is hard to guess. Changing the password signs everyone out.

## License

[MIT](LICENSE)

## Third-party

The admin ships the [Amiko](https://fonts.google.com/specimen/Amiko) font, served from the app itself rather than a CDN, under the SIL Open Font License 1.1. The license is included at `/admin/Amiko-OFL.txt`.
