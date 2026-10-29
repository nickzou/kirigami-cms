import { MemoryStore } from "../../src/core/index.js";
import { createApiApp } from "../../src/server/api.js";

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * The real pages API over an in-memory store, as a `fetch` the admin can use.
 * For stories and tests only; the admin itself never imports this.
 */
export function createFakeApi(
  files: Record<string, string>,
  wrap?: (real: FetchLike) => FetchLike,
) {
  const store = new MemoryStore(files);
  const api = createApiApp(store);
  const real: FetchLike = (input, init) =>
    Promise.resolve(
      api.request(new Request(new URL(input, "http://localhost"), init)),
    );
  return { store, fetch: wrap ? wrap(real) : real };
}

/** Makes `fetch` talk to a fake API. Returns the store and a function that undoes it. */
export function installFakeApi(
  files: Record<string, string>,
  wrap?: (real: FetchLike) => FetchLike,
) {
  const original = globalThis.fetch;
  const { store, fetch } = createFakeApi(files, wrap);
  globalThis.fetch = fetch as typeof globalThis.fetch;
  return {
    store,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const json = (body: unknown, status: number) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

/** Wrappers that make the fake API misbehave in a particular way. */
export const failures = {
  /** Every request fails with a server error. */
  serverError: (message: string) => (): FetchLike => () =>
    json({ error: { code: "internal", message } }, 500),
  /** Requests never finish, so the screen stays in its loading state. */
  never: (): FetchLike => () => new Promise<Response>(() => {}),
  /** Saving fails because the connection is down. */
  offlineSaves:
    (real: FetchLike): FetchLike =>
    (input, init) =>
      init?.method === "PUT"
        ? Promise.reject(new TypeError("Failed to fetch"))
        : real(input, init),
  /** Saving is refused because the page changed since it was read. */
  conflictOnSave:
    (real: FetchLike): FetchLike =>
    (input, init) =>
      init?.method === "PUT"
        ? json(
            {
              error: {
                code: "conflict",
                message: "The page changed since it was read.",
              },
              currentVersion: "someone-elses-version",
            },
            409,
          )
        : real(input, init),
  /** Saving is refused because the page no longer exists. */
  goneOnSave:
    (real: FetchLike): FetchLike =>
    (input, init) =>
      init?.method === "PUT"
        ? json(
            {
              error: { code: "conflict", message: "The page is gone." },
              currentVersion: null,
            },
            409,
          )
        : real(input, init),
};
