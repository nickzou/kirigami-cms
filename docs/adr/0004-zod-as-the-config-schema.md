# 0004: Zod as the config schema

Status: accepted

## Decision

Zod schemas are the single source of truth for site, template, and page config (the sidecar YAML files) and for the API. JSON Schema is generated from them, so editors give autocomplete and validation on the YAML files.

## Why

The project is configuration-first: presentation and behaviour live in readable config files, and the GUI edits that config. One schema gives validation with good error messages, IDE support for hand-editing, and the shapes behind the admin's forms.
