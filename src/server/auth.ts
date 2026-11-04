import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { passwordProblem } from "../core/index.js";
import { isSameOrigin } from "./origin.js";

export const SESSION_COOKIE = "kirigami_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

const digest = (value: string): Buffer =>
  createHash("sha256").update(value).digest();

/** Compares in constant time, whatever the lengths. */
const same = (a: string, b: string): boolean =>
  timingSafeEqual(digest(a), digest(b));

const failure = (code: string, message: string) => ({
  error: { code, message },
});

/**
 * The site's one shared password and the sessions it opens. A session is a
 * signed cookie holding its own expiry, so the server keeps nothing: a restart
 * keeps people signed in, and changing the password signs everyone out (the
 * signing key comes from it).
 */
export function createAuth(password: string, now: () => number = Date.now) {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);

  const key = createHmac("sha256", password)
    .update("kirigami session key")
    .digest();
  const sign = (expires: string): string =>
    createHmac("sha256", key).update(expires).digest("hex");

  const cookieIsValid = (value: string | undefined): boolean => {
    if (!value) return false;
    const parts = value.split(".");
    if (parts.length !== 2) return false;
    const [expires, signature] = parts as [string, string];
    return same(signature, sign(expires)) && Number(expires) > now();
  };

  const bearerMatches = (header: string | undefined): boolean => {
    const match = header ? /^Bearer (.+)$/i.exec(header) : null;
    return match ? same(match[1] as string, password) : false;
  };

  return {
    passwordMatches: (candidate: string): boolean => same(candidate, password),
    /** A new session's cookie value. */
    newSession(): string {
      const expires = String(now() + SESSION_SECONDS * 1000);
      return `${expires}.${sign(expires)}`;
    },
    /** Signed in by cookie, or by `Authorization: Bearer <the password>`. */
    isSignedIn: (c: Context): boolean =>
      cookieIsValid(getCookie(c, SESSION_COOKIE)) ||
      bearerMatches(c.req.header("authorization")),
  };
}

export type Auth = ReturnType<typeof createAuth>;

/** The cookie is `Secure` when the request came over HTTPS, here or at a proxy. */
function isSecure(c: Context): boolean {
  return (
    new URL(c.req.url).protocol === "https:" ||
    c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
  );
}

const cookieOptions = (c: Context) => ({
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: isSecure(c),
  path: "/",
});

/**
 * Refuses a request that is not signed in. Used ahead of the API and the event
 * stream; the sign-in routes below are mounted before it.
 */
export const requireSignIn =
  (auth: Auth): MiddlewareHandler =>
  async (c, next) => {
    if (auth.isSignedIn(c)) return next();
    return c.json(failure("unauthorized", "Sign in first."), 401);
  };

/**
 * `GET /api/session` says whether a password is needed and whether this
 * request is signed in (the admin asks first). `POST` signs in with
 * `{ "password": "..." }`; `DELETE` signs out. With no `auth`, nothing is
 * needed and everyone counts as signed in.
 */
export function createSessionApp(auth?: Auth) {
  const app = new Hono();
  const state = (c: Context, signedIn?: boolean) => ({
    required: auth !== undefined,
    signedIn: signedIn ?? (auth ? auth.isSignedIn(c) : true),
  });

  app.get("/api/session", (c) => c.json(state(c)));

  app.post("/api/session", async (c) => {
    if (!auth) {
      return c.json(
        failure(
          "not_required",
          "No password is set, so there is nothing to sign in to.",
        ),
        400,
      );
    }
    if (!isSameOrigin(c)) {
      return c.json(
        failure("forbidden", "Sign in from the admin on this address."),
        403,
      );
    }
    const body: unknown = await c.req.json().catch(() => undefined);
    const password =
      typeof body === "object" &&
      body !== null &&
      "password" in body &&
      typeof body.password === "string"
        ? body.password
        : undefined;
    if (password === undefined || !auth.passwordMatches(password)) {
      return c.json(
        failure("wrong_password", "That password is not right."),
        401,
      );
    }
    setCookie(c, SESSION_COOKIE, auth.newSession(), {
      ...cookieOptions(c),
      maxAge: SESSION_SECONDS,
    });
    return c.json(state(c, true));
  });

  app.delete("/api/session", (c) => {
    if (!isSameOrigin(c)) {
      return c.json(
        failure("forbidden", "Sign out from the admin on this address."),
        403,
      );
    }
    deleteCookie(c, SESSION_COOKIE, cookieOptions(c));
    return c.json(state(c, auth === undefined));
  });

  return app;
}
