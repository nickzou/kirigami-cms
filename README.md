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

```sh
pnpm build
node dist/cli/main.js build my-site     # writes my-site/dist
node dist/cli/main.js check my-site     # validates without building
```

Raw HTML in markdown is left out of the output. See [`test/fixtures/basic-site`](test/fixtures/basic-site) for an example, and [`schema/site.schema.json`](schema/site.schema.json) for editor autocomplete in `site.yaml`.

## License

[MIT](LICENSE)
