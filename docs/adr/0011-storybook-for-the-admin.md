# 0011: Storybook for the admin

Status: accepted

## Decision

The admin UI is built from small components that each have stories in Storybook (`pnpm storybook`, built in CI with `pnpm build:storybook`). Components in `admin/src/components` are presentational: they take props and hold no data fetching or app state. Screens (`PageList`, `Editor`) fetch and hold state, with the editor's logic in hooks (`admin/src/hooks`).

Stories for screens run against the real pages API over an in-memory store (`admin/src/fake-api.ts`), not hand-written mock data. A test renders every story, including its play function, so stories cannot silently break.

## Why

Most states a user can reach (loading, empty, error, conflict, saving) are awkward to produce in a running app. Stories make each one visible and reviewable, and the accessibility addon checks them. Using the real API means a story breaks when the API changes, the same way the app would. Keeping presentation apart from state keeps components small and easy to reuse in the tickets that follow (preview, new/rename/delete, settings form).

## Considered

Developing the admin only against `kirigami dev` (slower to reach odd states), and mocking the API with a service worker (more setup, and mocks can drift from the real API).

Telemetry is switched off in `.storybook/main.ts`.
