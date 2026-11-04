import { MemoryStore } from "../../src/core/index.js";
import { createApiApp } from "../../src/server/api.js";
import { createSiteApp } from "../../src/server/app.js";
import { createAuth, SESSION_COOKIE } from "../../src/server/auth.js";

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface FakeApiOptions {
  /**
   * Asks for this password, with the real sign-in code. The returned `fetch`
   * keeps the session cookie the way a browser would.
   */
  password?: string;
  /** Starts signed in (only with a password). */
  signedIn?: boolean;
}

/**
 * The real pages API over an in-memory store, as a `fetch` the admin can use.
 * For stories and tests only; the admin itself never imports this.
 */
export function createFakeApi(
  files: Record<string, string>,
  wrap?: (real: FetchLike) => FetchLike,
  { password, signedIn = false }: FakeApiOptions = {},
) {
  const store = new MemoryStore(files);
  const auth = password === undefined ? undefined : createAuth(password);
  const api = createApiApp(store, { allowAnyHost: auth !== undefined });
  const app = auth ? createSiteApp(() => [], { api, auth }) : api;
  // What a browser would hold: the session cookie, as `name=value`.
  let cookie = signedIn && auth ? `${SESSION_COOKIE}=${auth.newSession()}` : "";
  const real: FetchLike = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookie) headers.set("cookie", cookie);
    const response = await app.request(
      new Request(new URL(input, "http://localhost"), { ...init, headers }),
    );
    const set = response.headers.get("set-cookie");
    if (set) {
      const pair = set.split(";")[0] ?? "";
      cookie = pair.endsWith("=") ? "" : pair;
    }
    return response;
  };
  return {
    store,
    fetch: wrap ? wrap(real) : real,
    /** Forgets the session cookie, as if it had expired. */
    expireSession: () => {
      cookie = "";
    },
  };
}

/** Makes `fetch` talk to a fake API. Returns the store and a function that undoes it. */
export function installFakeApi(
  files: Record<string, string>,
  wrap?: (real: FetchLike) => FetchLike,
  options?: FakeApiOptions,
) {
  const original = globalThis.fetch;
  const { store, fetch, expireSession } = createFakeApi(files, wrap, options);
  globalThis.fetch = fetch as typeof globalThis.fetch;
  return {
    store,
    expireSession,
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
