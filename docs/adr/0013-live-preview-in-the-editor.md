# 0013: Live preview in the editor

Status: accepted

## Decision

The editor shows the real served page in an `<iframe>` beside the text box, from tablet width up, with a toggle to hide it. After a save, the dev server rebuilds, the admin hears about it, and the admin reloads the frame. The preview shows saved content, not text as it is typed.

- **The page API says where a page is shown.** `GET /api/pages/{path}` returns `url` (for example `/blog/hello/`), worked out by `pageUrl` in `src/core`, from the same rule that decides where a page's HTML goes. The admin does not repeat that rule.
- **The admin owns the reload.** It listens to the dev server's existing event stream (`/__kirigami/events`) and loads the frame again, as a new element, when a good build lands. The site's own live-reload script is not involved.
- **The frame is fully sandboxed (`sandbox=""`).** No scripts run in it, so the dev live-reload script and its error overlay cannot start, and the page cannot reach the admin even though it is served from the same address. Rendered pages need no scripts, because raw HTML in markdown is left out of the output. A link clicked inside the preview navigates the frame only.
- **A failed build shows in the editor, not the frame.** The admin shows the error above the editor. The frame keeps showing the last good build, because the server keeps serving it and the admin only reloads on a good build. A good build clears the error.
- **The editor keeps its state.** Reloading replaces only the frame, so the text box, its contents and its scroll position are untouched.

## Why

Reusing the event stream means no second channel and no change to what `kirigami dev` publishes. Letting the admin reload the frame avoids two things reloading at once. The sandbox is the simplest way to be sure the site's dev script stays out of the preview, and it costs nothing, since pages have no scripts of their own.

## Considered

Rendering the markdown in the browser as the user types would show unsaved text, but it needs `core` rendering in the browser and a second path to the same HTML. That is left for later. Giving the frame a query flag so the server leaves out the dev script was rejected: the sandbox does the same job without the server having to know about it.
