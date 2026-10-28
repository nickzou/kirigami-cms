# 0006: React 19 and Vite for the admin

Status: accepted

## Decision

The admin UI is a React 19 single-page app built with Vite, served by the same server and built as part of the single package.

The editor starts as a plain textarea. A CodeMirror 6 live-preview markdown editor is planned as a spike once `core` and the API work.

## Why

React has the largest ecosystem for forms and component kits. Bundle size barely matters for a self-hosted admin, so Preact's size advantage didn't outweigh React's compatibility. Forms are generated from the Zod schemas ([0004](0004-zod-as-the-config-schema.md)), and CodeMirror is framework-agnostic, so the framework choice stays easy to change.

CodeMirror 6 is preferred over a WYSIWYG editor because it keeps markdown byte-faithful, which the portability principle requires.

## Considered

Preact (smaller, with `preact/compat` edge cases) and Svelte 5.
