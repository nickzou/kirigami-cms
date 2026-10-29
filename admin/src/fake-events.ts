/**
 * A stand-in for the dev server's event stream, for stories and tests only.
 * `installFakeEvents` swaps it in for `EventSource`; `events` then plays the
 * server's part.
 */
interface FakeSource {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
}

const sources = new Set<FakeSource>();

class FakeEventSource implements FakeSource {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(readonly url: string) {
    sources.add(this);
    queueMicrotask(() => this.onopen?.(new Event("open")));
  }
  close() {
    sources.delete(this);
  }
}

const send = (event: unknown) => {
  for (const source of sources) {
    source.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(event) }),
    );
  }
};

/** What the server tells the open admin tabs. */
export const events = {
  /** A good build landed. */
  reload: () => send({ type: "reload" }),
  /** A build failed. */
  fail: (message: string) => send({ type: "error", message }),
  /** How many pages are listening right now. */
  listeners: () => sources.size,
};

/** Makes `EventSource` a fake. Returns a function that undoes it. */
export function installFakeEvents() {
  const original = globalThis.EventSource;
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
  return () => {
    sources.clear();
    globalThis.EventSource = original;
  };
}
