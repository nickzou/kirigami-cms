/** URLs the dev server reserves for itself. */
export const EVENTS_PATH = "/__kirigami/events";
export const CLIENT_SCRIPT_PATH = "/__kirigami/client.js";

/** The tag added to served pages in dev. Never part of built output. */
export const SCRIPT_TAG = `<script src="${CLIENT_SCRIPT_PATH}"></script>`;

/**
 * The browser side of live reload. Reloads on a successful rebuild, shows a
 * failed one as an overlay, and reloads when the connection comes back after
 * the server restarted. Error text goes in with textContent, never as HTML.
 */
export const CLIENT_SCRIPT = `(() => {
  let overlay;
  let connected = false;

  function show(message) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;overflow:auto;padding:2rem;" +
        "background:rgba(20,20,20,.94);color:#fff;font:14px/1.5 ui-monospace,monospace";
      document.body.append(overlay);
    }
    overlay.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = "Build failed";
    title.style.cssText = "margin:0 0 1rem;color:#ff8080";
    const text = document.createElement("pre");
    text.textContent = message;
    text.style.cssText = "white-space:pre-wrap;margin:0 0 1rem";
    const note = document.createElement("p");
    note.textContent = "Fix it and save. This clears on the next good build.";
    overlay.append(title, text, note);
  }

  const source = new EventSource(${JSON.stringify(EVENTS_PATH)});
  source.onopen = () => {
    if (connected) location.reload();
    connected = true;
  };
  source.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.type === "reload") location.reload();
    else if (event.type === "error") show(event.message);
  };
})();
`;
