/**
 * What the open browser tabs are told: that the content changed on disk (an
 * edit from the admin or from anything else, before the rebuild), and how the
 * build then went.
 */
export type DevEvent =
  | { type: "changed" }
  | { type: "reload" }
  | { type: "error"; message: string };

export interface EventHub {
  /**
   * Tells every subscriber. An error is remembered until the next reload; a
   * change does not touch it, since the rebuild it starts has not said yet.
   */
  publish(event: DevEvent): void;
  /** Starts listening; a current error is replayed at once. Returns an unsubscribe function. */
  subscribe(listener: (event: DevEvent) => void): () => void;
}

export function createEventHub(): EventHub {
  const listeners = new Set<(event: DevEvent) => void>();
  let currentError: DevEvent | undefined;

  return {
    publish(event) {
      if (event.type === "error") currentError = event;
      else if (event.type === "reload") currentError = undefined;
      for (const listener of listeners) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      if (currentError) listener(currentError);
      return () => listeners.delete(listener);
    },
  };
}
