# 0001: TypeScript on Node

Status: accepted

## Decision

The whole project (core engine, server, CLI, admin) is written in TypeScript with `strict` enabled, and runs on the current Active LTS release of Node. The version is pinned in `.nvmrc` and `engines`, and used in CI and the Dockerfile. Bump it deliberately when a new LTS goes active.

## Why

One language across the stack keeps the project approachable for contributors, and the admin has to be TypeScript or JavaScript anyway. Node has the best ecosystem for markdown (unified/remark), YAML, and templating.

## Considered

Bun or Deno as the runtime, and Go. Neither offers enough to justify splitting the ecosystem or narrowing who can contribute.
