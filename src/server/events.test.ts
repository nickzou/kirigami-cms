import { describe, expect, it } from "vitest";
import { createEventHub, type DevEvent } from "./events.js";

const collect = () => {
  const seen: DevEvent[] = [];
  return { seen, listener: (e: DevEvent) => seen.push(e) };
};

describe("createEventHub", () => {
  it("tells every subscriber", () => {
    const hub = createEventHub();
    const a = collect();
    const b = collect();
    hub.subscribe(a.listener);
    hub.subscribe(b.listener);
    hub.publish({ type: "reload" });
    expect(a.seen).toEqual([{ type: "reload" }]);
    expect(b.seen).toEqual([{ type: "reload" }]);
  });

  it("stops telling a subscriber after it unsubscribes", () => {
    const hub = createEventHub();
    const a = collect();
    const off = hub.subscribe(a.listener);
    off();
    hub.publish({ type: "reload" });
    expect(a.seen).toEqual([]);
  });

  it("replays a current error to a new subscriber until the next reload", () => {
    const hub = createEventHub();
    hub.publish({ type: "error", message: "bad" });

    const late = collect();
    hub.subscribe(late.listener);
    expect(late.seen).toEqual([{ type: "error", message: "bad" }]);

    hub.publish({ type: "reload" });
    const later = collect();
    hub.subscribe(later.listener);
    expect(later.seen).toEqual([]);
  });

  it("does not replay a plain reload", () => {
    const hub = createEventHub();
    hub.publish({ type: "reload" });
    const late = collect();
    hub.subscribe(late.listener);
    expect(late.seen).toEqual([]);
  });
});
