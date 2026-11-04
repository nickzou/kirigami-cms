import type {
  ApiError,
  Conflict,
  Page,
  PageSummary,
  Saved,
  SiteConfig,
  SiteConfigChange,
} from "../../src/server/api-schemas.js";

export type { Page, PageSummary, Saved, SiteConfig, SiteConfigChange };

/** Something the API refused or could not do, with the message to show. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The API's error code, e.g. `exists` or `collision`, when it gave one. */
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** The page changed (or vanished) since it was read; nothing was written. */
export class ConflictError extends ApiRequestError {
  constructor(
    message: string,
    /** The page's version now, or null if the page is gone. */
    readonly currentVersion: string | null,
  ) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/** What the server says about signing in (`GET /api/session`). */
export interface Session {
  /** A password is set, so the admin must be signed in to. */
  required: boolean;
  signedIn: boolean;
}

const signedOutListeners = new Set<() => void>();

/**
 * Calls `listener` whenever the server turns a request away because there is
 * no session (it expired, or the password changed). Returns how to stop.
 */
export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener);
  return () => {
    signedOutListeners.delete(listener);
  };
}

async function failure(
  response: Response,
  announceSignedOut = true,
): Promise<ApiRequestError> {
  if (announceSignedOut && response.status === 401) {
    for (const listener of signedOutListeners) listener();
  }
  try {
    const body = (await response.json()) as ApiError | Conflict;
    if (
      response.status === 409 &&
      "currentVersion" in body &&
      body.error.code === "conflict"
    ) {
      return new ConflictError(body.error.message, body.currentVersion);
    }
    return new ApiRequestError(
      body.error.message,
      response.status,
      body.error.code,
    );
  } catch {
    return new ApiRequestError(
      `The server answered ${response.status}.`,
      response.status,
    );
  }
}

export async function listPages(signal?: AbortSignal): Promise<PageSummary[]> {
  const response = await fetch("/api/pages", { signal });
  if (!response.ok) throw await failure(response);
  return ((await response.json()) as { pages: PageSummary[] }).pages;
}

const pageUrl = (path: string): string =>
  `/api/pages/${encodeURIComponent(path)}`;

export async function getPage(
  path: string,
  signal?: AbortSignal,
): Promise<Page> {
  const response = await fetch(pageUrl(path), { signal });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as Page;
}

/** Saves a page. `version` is the one last read, or null to create it. */
export async function savePage(
  path: string,
  content: string,
  version: string | null,
): Promise<Saved> {
  const response = await fetch(pageUrl(path), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, version }),
  });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as Saved;
}

/** Creates a page that must not exist yet. */
export const createPage = (path: string, content: string): Promise<Saved> =>
  savePage(path, content, null);

/** Deletes a page. `version` is the one last read. */
export async function deletePage(path: string, version: string): Promise<void> {
  const response = await fetch(
    `${pageUrl(path)}?version=${encodeURIComponent(version)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw await failure(response);
}

/** Moves a page to a new path. Never overwrites. Returns the new path. */
export async function renamePage(
  path: string,
  to: string,
  version: string,
): Promise<Saved> {
  const response = await fetch(`${pageUrl(path)}/rename`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to, version }),
  });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as Saved;
}

/** The site config (site.yaml): its text, version, and the values it sets. */
export async function getSiteConfig(signal?: AbortSignal): Promise<SiteConfig> {
  const response = await fetch("/api/site-config", { signal });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as SiteConfig;
}

/**
 * Changes settings in the site config. `version` is the one last read (null if
 * there was no file). A setting set to null is removed, so its default applies.
 */
export async function saveSiteConfig(
  changes: SiteConfigChange[],
  version: string | null,
): Promise<SiteConfig> {
  const response = await fetch("/api/site-config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ changes, version }),
  });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as SiteConfig;
}

export async function getSession(signal?: AbortSignal): Promise<Session> {
  const response = await fetch("/api/session", { signal });
  if (!response.ok) throw await failure(response, false);
  return (await response.json()) as Session;
}

/** Signs in. A wrong password is an `ApiRequestError` (status 401) with the message to show. */
export async function signIn(password: string): Promise<Session> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw await failure(response, false);
  return (await response.json()) as Session;
}

export async function signOut(): Promise<void> {
  const response = await fetch("/api/session", { method: "DELETE" });
  if (!response.ok) throw await failure(response, false);
}
