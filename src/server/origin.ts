import type { Context } from "hono";

/**
 * Whether a request came from a page on this same address. A request with no
 * `Origin` header (curl, a script) counts as fine: only a browser sends one,
 * and a browser sends it on every request another website could make.
 */
export function isSameOrigin(c: Context): boolean {
  const origin = c.req.header("origin");
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === new URL(c.req.url).host;
  } catch {
    return false;
  }
}
