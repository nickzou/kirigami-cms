import type { ApiError, PageSummary } from "../../src/server/api-schemas.js";

export type { PageSummary };

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

async function failure(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiError;
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
