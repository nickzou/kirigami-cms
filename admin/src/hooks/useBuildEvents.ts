import { useEffect, useState } from "react";

// Where the dev server publishes build results (see src/server/client-script.ts).
const EVENTS_PATH = "/__kirigami/events";

export interface BuildEvents {
  /** Why the latest build failed, or null when the last build was good. */
  error: string | null;
  /** Goes up each time a good build lands (or the server comes back). */
  reloads: number;
  /**
   * Goes up each time the content changes on disk, by the admin or by anything
   * else, before the rebuild says how it went.
   */
  changes: number;
}

type Message =
  | { type: "changed" }
  | { type: "reload" }
  | { type: "error"; message: string };

function parse(data: unknown): Message | undefined {
  try {
    const value: unknown = JSON.parse(String(data));
    if (typeof value !== "object" || value === null) return undefined;
    const { type, message } = value as { type?: unknown; message?: unknown };
    if (type === "reload" || type === "changed") return { type };
    if (type === "error" && typeof message === "string")
      return { type, message };
  } catch {
    // Not one of ours; ignore it.
  }
  return undefined;
}

/**
 * Follows the dev server's build events. The admin, not the preview page,
 * listens for them, so it decides when the preview reloads. A failed build
 * leaves `reloads` alone, so the preview keeps showing the last good build.
 * `changes` tells a screen that pages may have changed outside the admin.
 */
export function useBuildEvents(): BuildEvents {
  const [state, setState] = useState<BuildEvents>({
    error: null,
    reloads: 0,
    changes: 0,
  });

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(EVENTS_PATH);
    let connected = false;

    source.onopen = () => {
      // Coming back after the server restarted: the preview may be stale.
      if (connected) setState((s) => ({ ...s, reloads: s.reloads + 1 }));
      connected = true;
    };
    source.onmessage = (message) => {
      const event = parse(message.data);
      if (event?.type === "changed") {
        setState((s) => ({ ...s, changes: s.changes + 1 }));
      } else if (event?.type === "reload") {
        setState((s) => ({ ...s, error: null, reloads: s.reloads + 1 }));
      } else if (event?.type === "error") {
        setState((s) => ({ ...s, error: event.message }));
      }
    };
    return () => source.close();
  }, []);

  return state;
}
