import { describe, expect, it } from "vitest";
import { MemoryStore } from "../core/index.js";
import { createAdminApp } from "./admin.js";
import { createApiApp } from "./api.js";
import { createSiteApp } from "./app.js";
import { createAuth, SESSION_COOKIE, SESSION_SECONDS } from "./auth.js";
import { createEventHub } from "./events.js";

const PASSWORD = "correct horse";
const files = [{ path: "index.html", content: "<h1>Home</h1>" }];

function setup(password: string | null = PASSWORD, now = Date.now) {
  const auth = password === null ? undefined : createAuth(password, now);
  const app = createSiteApp(() => files, {
    hub: createEventHub(),
    api: createApiApp(new MemoryStore({ "a.md": "# A\n" }), {
      allowAnyHost: auth !== undefined,
    }),
    admin: createAdminApp("/nonexistent-admin-dir"),
    auth,
  });
  const request = (path: string, init?: RequestInit, host = "localhost") =>
    app.request(`http://${host}${path}`, init);
  const signIn = (body: unknown = { password: PASSWORD }, init?: RequestInit) =>
    request("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    });
  return { request, signIn };
}

/** The `name=value` part of a Set-Cookie header, ready to send back. */
const cookieFrom = (res: Response): string =>
  (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

describe("with a password", () => {
  it("refuses the API and the event stream when signed out", async () => {
    const { request } = setup();
    for (const path of [
      "/api/pages",
      "/api/pages/a.md",
      "/__kirigami/events",
    ]) {
      const res = await request(path);
      expect(res.status).toBe(401);
    }
    const res = await request("/api/pages");
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "Sign in first." },
    });
  });

  it("refuses writes when signed out", async () => {
    const { request } = setup();
    const res = await request("/api/pages/b.md", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "x", version: null }),
    });
    expect(res.status).toBe(401);
  });

  it("keeps the site and the admin's own files open", async () => {
    const { request } = setup();
    expect((await request("/")).status).toBe(200);
    expect((await request("/admin/")).status).not.toBe(401);
    expect((await request("/admin/login")).status).not.toBe(401);
  });

  it("says a password is needed and that you are signed out", async () => {
    const { request } = setup();
    const res = await request("/api/session");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ required: true, signedIn: false });
  });

  it("refuses a wrong password, and sets no cookie", async () => {
    const { signIn } = setup();
    for (const body of [{ password: "nope nope" }, { password: "" }, {}, []]) {
      const res = await signIn(body);
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
      expect(await res.json()).toEqual({
        error: {
          code: "wrong_password",
          message: "That password is not right.",
        },
      });
    }
  });

  it("refuses a body that is not JSON", async () => {
    const { request } = setup();
    const res = await request("/api/session", {
      method: "POST",
      body: "password=correct horse",
    });
    expect(res.status).toBe(401);
  });

  it("signs in with the right password and opens the API with the cookie", async () => {
    const { request, signIn } = setup();
    const res = await signIn();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ required: true, signedIn: true });

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toContain(`Max-Age=${SESSION_SECONDS}`);
    expect(setCookie).not.toMatch(/Secure/i);

    const headers = { cookie: cookieFrom(res) };
    expect((await request("/api/pages", { headers })).status).toBe(200);
    expect(await (await request("/api/session", { headers })).json()).toEqual({
      required: true,
      signedIn: true,
    });
  });

  it("marks the cookie Secure over HTTPS, here or at a proxy", async () => {
    const { signIn } = setup();
    const direct = await signIn();
    expect(direct.headers.get("set-cookie")).not.toMatch(/Secure/i);

    const proxied = await signIn(undefined, {
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
      },
    });
    expect(proxied.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it("opens the API with the password as a Bearer token", async () => {
    const { request } = setup();
    const ok = await request("/api/pages", {
      headers: { authorization: `Bearer ${PASSWORD}` },
    });
    expect(ok.status).toBe(200);
    const wrong = await request("/api/pages", {
      headers: { authorization: "Bearer nope nope" },
    });
    expect(wrong.status).toBe(401);
    const odd = await request("/api/pages", {
      headers: { authorization: PASSWORD },
    });
    expect(odd.status).toBe(401);
  });

  it("refuses a tampered or foreign cookie", async () => {
    const { request, signIn } = setup();
    const cookie = cookieFrom(await signIn());
    const [name, value] = cookie.split("=") as [string, string];
    const [expires, signature] = value.split(".") as [string, string];

    const longer = `${name}=${Number(expires) + 1000}.${signature}`;
    const flipped = `${name}=${expires}.${signature.replace(/.$/, signature.endsWith("0") ? "1" : "0")}`;
    for (const forged of [
      longer,
      flipped,
      `${name}=garbage`,
      `${name}=a.b.c`,
    ]) {
      const res = await request("/api/pages", { headers: { cookie: forged } });
      expect(res.status).toBe(401);
    }
  });

  it("ends the session after seven days", async () => {
    let now = 1_000_000;
    const { request, signIn } = setup(PASSWORD, () => now);
    const cookie = cookieFrom(await signIn());
    now += SESSION_SECONDS * 1000 - 1;
    expect((await request("/api/pages", { headers: { cookie } })).status).toBe(
      200,
    );
    now += 1;
    expect((await request("/api/pages", { headers: { cookie } })).status).toBe(
      401,
    );
  });

  it("signs everyone out when the password changes", async () => {
    const first = setup("first password");
    const cookie = cookieFrom(
      await first.signIn({ password: "first password" }),
    );
    const second = setup("second password");
    const res = await second.request("/api/pages", { headers: { cookie } });
    expect(res.status).toBe(401);
  });

  it("keeps a session across a restart (same password, new server)", async () => {
    const cookie = cookieFrom(await setup().signIn());
    const res = await setup().request("/api/pages", { headers: { cookie } });
    expect(res.status).toBe(200);
  });

  it("signs out by clearing the cookie", async () => {
    const { request, signIn } = setup();
    const cookie = cookieFrom(await signIn());
    const res = await request("/api/session", {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ required: true, signedIn: false });
    expect(res.headers.get("set-cookie")).toMatch(
      new RegExp(`${SESSION_COOKIE}=;`),
    );
  });

  it("refuses to sign in or out from another website's page", async () => {
    const { request, signIn } = setup();
    const foreign = {
      "content-type": "application/json",
      origin: "http://evil.example",
    };
    expect((await signIn(undefined, { headers: foreign })).status).toBe(403);
    expect(
      (await request("/api/session", { method: "DELETE", headers: foreign }))
        .status,
    ).toBe(403);
  });

  it("refuses a cookie-signed write from another website's page", async () => {
    const { request, signIn } = setup();
    const cookie = cookieFrom(await signIn());
    const res = await request("/api/pages/b.md", {
      method: "PUT",
      headers: {
        cookie,
        origin: "http://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ content: "x", version: null }),
    });
    expect(res.status).toBe(403);
  });

  it("answers on any host name, since the password guards it", async () => {
    const { request } = setup();
    const res = await request(
      "/api/pages",
      { headers: { authorization: `Bearer ${PASSWORD}` } },
      "cms.example.com",
    );
    expect(res.status).toBe(200);
  });

  it("rejects a password that is too short", () => {
    expect(() => createAuth("short")).toThrow(/at least 8 characters/);
  });
});

describe("with no password", () => {
  it("leaves everything open, as before", async () => {
    const { request } = setup(null);
    expect((await request("/api/pages")).status).toBe(200);
    expect(await (await request("/api/session")).json()).toEqual({
      required: false,
      signedIn: true,
    });
  });

  it("has nothing to sign in to", async () => {
    const { signIn } = setup(null);
    expect((await signIn()).status).toBe(400);
  });

  it("still answers only to this machine's host names", async () => {
    const { request } = setup(null);
    const res = await request("/api/pages", undefined, "cms.example.com");
    expect(res.status).toBe(403);
  });
});
