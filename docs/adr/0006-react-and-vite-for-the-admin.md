# 0006: React 19 and Vite for the admin

Status: accepted

## Decision

The admin UI is a React 19 single-page app built with Vite, served by the same server and built as part of the single package.

The editor started as a plain textarea. It is now a CodeMirror 6 editor (still plain text, loaded as its own chunk when a page is opened to edit); it draws the markdown as formatted text (headings, emphasis, links, quotes, code, rules) in the site's own theme, hiding the marks except at the cursor, and tables and images follow. What it holds is exactly what is saved, so it never changes a character that was not typed.

## Why

React has the largest ecosystem for forms and component kits. Bundle size barely matters for a self-hosted admin, so Preact's size advantage didn't outweigh React's compatibility. Forms are generated from the Zod schemas ([0004](0004-zod-as-the-config-schema.md)), and CodeMirror is framework-agnostic, so the framework choice stays easy to change.

CodeMirror 6 is preferred over a WYSIWYG editor because it keeps markdown byte-faithful, which the portability principle requires.

## Considered

Preact (smaller, with `preact/compat` edge cases) and Svelte 5.
