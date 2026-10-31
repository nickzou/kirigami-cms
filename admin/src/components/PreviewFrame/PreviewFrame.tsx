import { useState } from "react";

export interface PreviewFrameProps {
  /** Where the dev server shows the page, e.g. `/blog/hello/`. */
  url: string;
  /** Change this to reload the preview. */
  version: number;
  /** Names the frame for screen readers. */
  title: string;
}

// Whole class strings, so UnoCSS can find them. The frame on show takes its
// place in the page; the one still loading sits over it, unseen.
const shownClass =
  ":uno: block min-h-[60vh] w-full rounded-lg border border-solid border-line bg-white shadow";
const loadingClass =
  ":uno: pointer-events-none absolute inset-0 block h-full w-full rounded-lg border border-solid border-line bg-white opacity-0";

/**
 * The page as the site shows it. The frame is fully sandboxed: no scripts
 * run in it, so the dev live-reload script and its overlay cannot start (the
 * admin reloads the frame itself), and the page cannot reach the admin.
 *
 * Reloading makes a new frame, since a sandboxed frame cannot reload itself.
 * The new one loads unseen over the old one, and takes its place when its
 * `load` event fires, so the old content stays on screen until the new is
 * ready: no blank flash. The new frame starts at the top of the page (a
 * sandboxed frame's scroll position is out of reach).
 */
export function PreviewFrame({ url, version, title }: PreviewFrameProps) {
  const current = { key: `${version}|${url}`, url };
  const [shown, setShown] = useState(current);
  // The frame on show and, while it loads, the one that will replace it. A
  // build that lands in the meantime replaces the one still loading.
  const frames = shown.key === current.key ? [current] : [shown, current];
  return (
    <div className=":uno: relative">
      {frames.map((frame) => {
        const loading = frame.key !== shown.key;
        return (
          <iframe
            key={frame.key}
            src={frame.url}
            title={title}
            sandbox=""
            aria-hidden={loading || undefined}
            tabIndex={loading ? -1 : undefined}
            className={loading ? loadingClass : shownClass}
            onLoad={loading ? () => setShown(frame) : undefined}
          />
        );
      })}
    </div>
  );
}
