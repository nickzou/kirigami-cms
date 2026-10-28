/** What the open browser tabs are told about the build. */
export type DevEvent = { type: "reload" } | { type: "error"; message: string };

export interface EventHub {
  /** Tells every subscriber. An error is remembered until the next reload. */
  publish(event: DevEvent): void;
  /** Starts listening; a current error is replayed at once. Returns an unsubscribe function. */
  subscribe(listener: (event: DevEvent) => void): () => void;
}

export function createEventHub(): EventHub {
  const listeners = new Set<(event: DevEvent) => void>();
  let currentError: DevEvent | undefined;

  return {
    publish(event) {
      currentError = event.type === "error" ? event : undefined;
      for (const listener of listeners) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      if (currentError) listener(currentError);
      return () => listeners.delete(listener);
    },
  };
}
