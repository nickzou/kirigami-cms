import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type FolderWatcher, watchFolder } from "./watch.js";

const cleanup: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0)) await fn();
});

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "kirigami-watch-"));
  await mkdir(join(root, "node_modules"));
  await mkdir(join(root, "blog"));
  let changes = 0;
  const watcher: FolderWatcher = watchFolder(root, {
    ignore: ["node_modules", ".git"],
    relevant: (p) => p.endsWith(".md"),
    onChange: () => {
      changes += 1;
    },
    onError: (e) => {
      throw e;
    },
    debounceMs: 50,
  });
  cleanup.push(
    () => watcher.close(),
    () => rm(root, { recursive: true, force: true }),
  );
  // Let the watcher settle before the first write.
  await new Promise((r) => setTimeout(r, 100));
  return { root, watcher, changes: () => changes };
}

const quiet = () => new Promise((r) => setTimeout(r, 400));

describe("watchFolder", () => {
  it("reports a burst of saves as one change", async () => {
    const { root, changes } = await setup();
    for (let i = 0; i < 5; i++)
      await writeFile(join(root, "index.md"), `# ${i}\n`);
    await vi.waitFor(() => expect(changes()).toBeGreaterThan(0));
    await quiet();
    expect(changes()).toBe(1);
  });

  it("notices pages in nested folders", async () => {
    const { root, changes } = await setup();
    await writeFile(join(root, "blog/post.md"), "# Post\n");
    await vi.waitFor(() => expect(changes()).toBe(1));
  });

  it("ignores listed folders and files that are not site sources", async () => {
    const { root, changes } = await setup();
    await writeFile(join(root, "node_modules/readme.md"), "x");
    await writeFile(join(root, "notes.txt"), "x");
    await writeFile(join(root, ".index.md.swp"), "x");
    await quiet();
    expect(changes()).toBe(0);
  });

  it("stops reporting after close", async () => {
    const { root, changes, watcher } = await setup();
    watcher.close();
    await writeFile(join(root, "a.md"), "x");
    await quiet();
    expect(changes()).toBe(0);
  });
});
