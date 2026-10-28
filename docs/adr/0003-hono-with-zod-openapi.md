# 0003: Hono with Zod OpenAPI for the server

Status: accepted

## Decision

The server uses Hono, with `@hono/zod-openapi`, and exposes a REST API described by OpenAPI. The same Zod schemas drive request validation, API documentation, and types.

## Why

Hono is small and typed, and runs on Node and other runtimes. A documented REST API supports the headless use case, and one schema per shape avoids drift between validation, docs, and types.

## Considered

Fastify (mature, heavier) and Express (familiar, weaker typing).
