# 0016: Shared-password sign-in

Status: accepted

## Decision

The admin and the API are protected by **one shared password**, read only from the **`KIRIGAMI_PASSWORD`** environment variable. It is never a field in `kirigami.config.yaml` (credentials are referenced, never written there; see [0014](0014-project-configuration.md)). It must be at least 8 characters, checked whenever it is set, on this machine too. An empty variable counts as unset.

- **What is behind it.** `/api/*` and the live-reload stream (`/__kirigami/events`). The built site and its stylesheet are public, since publishing them is the point. The admin's own files (`/admin/*`) are public too: they are the same open-source app for everyone and hold no content, and it lets the app show its own sign-in screen when `GET /api/session` says it is signed out.
- **When it is on.** With a password set, it applies everywhere, `127.0.0.1` included, so what you test is what you deploy. With none set and the server listening only on this machine, nothing is asked, as before. With none set and `--host` naming any other address, `kirigami dev` **refuses to start** and says how to set one.
- **The session.** `POST /api/session` with `{ "password": "…" }` sets a cookie holding its own expiry and an HMAC of it. The key is derived from the password, so the server keeps no sessions: a restart keeps people signed in, and changing the password signs everyone out. The cookie is `HttpOnly`, `SameSite=Lax`, path `/`, lasts 7 days, and is `Secure` when the request came over HTTPS or a proxy sent `X-Forwarded-Proto: https`. `DELETE /api/session` signs out; `GET /api/session` says `{ required, signedIn }`.
- **Scripts.** `Authorization: Bearer <the password>` is accepted on the API. The password is compared in constant time.
- **Cross-site requests.** Besides `SameSite=Lax`, the API refuses any request whose `Origin` header is present and does not match the host (requests with no `Origin`, such as curl, pass). This was already so; it now also covers signing in and out.
- **Host names.** The API used to answer only to `localhost`, `127.0.0.1` and `[::1]`, which stops another website reaching it by rebinding a DNS name to this machine. A server that signs people in answers on any host name, because the password guards it instead. Without a password the rule stays.
- **No TLS.** Kirigami speaks plain HTTP. Beyond a network you trust, put a proxy that terminates HTTPS in front of it.

## Why

The container made it easy to listen beyond the machine, and the admin can change every page, so an open port is a hole. One shared password is the smallest thing that closes it and keeps setup easy for developers and non-developers alike ([core mandate](../../README.md)). A stateless signed cookie needs no session store, which would otherwise need a place to live on the server. Making the unsafe case an error, not a warning, means nobody exposes the admin by accident.

## Left out, on purpose

- **User accounts** (who changed a page, roles, per-user tokens, revoking one session). A separate ticket.
- **Slowing down repeated wrong guesses.** A separate ticket; until then a hard-to-guess password is the defence, and the docs say so.
- **A `--no-auth` switch** for people who sit behind their own proxy. Add it when someone asks.
- **A `_FILE` variant** of the variable, for Docker secrets. Same.
