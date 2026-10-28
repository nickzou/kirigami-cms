import type {
  ApiError,
  Conflict,
  Page,
  PageSummary,
  Saved,
} from "../../src/server/api-schemas.js";

export type { Page, PageSummary, Saved };

/** Something the API refused or could not do, with the message to show. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
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

async function failure(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiError | Conflict;
    if (response.status === 409 && "currentVersion" in body) {
      return new ConflictError(body.error.message, body.currentVersion);
    }
    return new ApiRequestError(body.error.message, response.status);
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
