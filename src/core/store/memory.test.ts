import { describe, expect, it } from "vitest";
import { describeContentStore } from "../../../test/store-contract.js";
import { MemoryStore } from "./memory.js";

describeContentStore("MemoryStore", async () => new MemoryStore());

describe("MemoryStore", () => {
  it("can be seeded with files", async () => {
    const store = new MemoryStore({ "a.md": "one", "b/c.md": "two" });
    expect((await store.read("a.md")).content).toBe("one");
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md", "b/c.md"]);
  });
});
