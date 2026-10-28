# 0005: LiquidJS for templates

Status: accepted

## Decision

Templates are written in LiquidJS, with custom tags for slots and components. We do not invent a template syntax.

## Why

Liquid is sandboxed: templates can't run arbitrary code, which matters if untrusted contributors ever supply templates. It is readable, widely known, and extensible. Non-developers don't write templates by hand; the design tools generate them, so the language can be developer-oriented as long as the tools produce clean output.

## Considered

- Nunjucks: powerful, but slower maintenance and looser sandboxing.
- Handlebars: weaker for components and slots.
- Eta or EJS: arbitrary JavaScript in templates, unsafe.
- JSX components rendered on the server: ties templates to a UI framework and is hard for design tools to generate or round-trip.
