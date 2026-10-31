// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { createFakeApi } from "./fake-api.js";
import { events, installFakeEvents } from "./fake-events.js";

let restoreEvents: () => void;

beforeEach(() => {
  restoreEvents = installFakeEvents();
});

afterEach(() => {
  cleanup();
  restoreEvents();
  vi.unstubAllGlobals();
});

function open(path: string, files: Record<string, string>) {
  const { store, fetch } = createFakeApi(files);
  vi.stubGlobal("fetch", fetch);
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return store;
}

const editor = () =>
  screen.findByLabelText("Markdown") as Promise<HTMLTextAreaElement>;
const type = (box: HTMLTextAreaElement, value: string) =>
  fireEvent.change(box, { target: { value } });
const saveButton = () =>
  screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;

/** What another program does: write the file, and the server says so. */
async function editOutside(
  store: ReturnType<typeof open>,
  path: string,
  content: string,
) {
  await store.write(path, content, (await store.read(path)).version);
  await waitFor(() => expect(events.listeners()).toBe(1));
  act(() => events.changed());
}

describe("Editor: edits made outside the admin", () => {
  it("loads the new text quietly when there is nothing unsaved, and says so", async () => {
    const store = open("/pages/a.md", { "a.md": "one\n" });
    const box = await editor();
    await editOutside(store, "a.md", "two\n");
    await waitFor(() => expect(box.value).toBe("two\n"));
    expect(
      (await screen.findByText(/changed outside the admin/)).closest(
        '[role="status"]',
      ),
    ).not.toBeNull();
    // It is what is on disk now, so there is nothing to save.
    expect(saveButton().disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps unsaved text and offers a choice instead", async () => {
    const store = open("/pages/a.md", { "a.md": "one\n" });
    const box = await editor();
    type(box, "mine\n");
    await editOutside(store, "a.md", "theirs\n");

    expect(
      await screen.findByText(/This page changed outside the admin/),
    ).toBeDefined();
    // Nothing was lost, and nothing was loaded over it.
    expect(box.value).toBe("mine\n");

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByText(/changed outside the admin/)).toBeNull();
    expect(box.value).toBe("mine\n");
  });

  it("loads the latest when asked, discarding what was unsaved", async () => {
    const store = open("/pages/a.md", { "a.md": "one\n" });
    type(await editor(), "mine\n");
    await editOutside(store, "a.md", "theirs\n");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Load the latest and discard my changes",
      }),
    );
    // The page loads again, as a new text box.
    await waitFor(async () => expect((await editor()).value).toBe("theirs\n"));
    expect(screen.queryByText(/changed outside the admin/)).toBeNull();
  });

  it("says when the page is gone, and does not offer to load it", async () => {
    const store = open("/pages/a.md", { "a.md": "one\n", "b.md": "b\n" });
    const box = await editor();
    type(box, "mine\n");
    await store.delete("a.md", (await store.read("a.md")).version);
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.changed());
    expect(
      await screen.findByText(/deleted or renamed outside the admin/),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", {
        name: "Load the latest and discard my changes",
      }),
    ).toBeNull();
    expect(box.value).toBe("mine\n");
  });

  it("does nothing for the admin's own save", async () => {
    const store = open("/pages/a.md", { "a.md": "one\n" });
    const box = await editor();
    type(box, "mine\n");
    fireEvent.click(saveButton());
    await screen.findByText("Saved.");
    await waitFor(() => expect(events.listeners()).toBe(1));
    // The server tells of the change its own write made.
    act(() => events.changed());
    await waitFor(async () =>
      expect((await store.read("a.md")).content).toBe("mine\n"),
    );
    expect(box.value).toBe("mine\n");
    expect(screen.queryByText(/outside the admin/)).toBeNull();
  });

  it("does nothing when the change was to another page", async () => {
    const store = open("/pages/a.md", { "a.md": "one\n", "b.md": "b\n" });
    const box = await editor();
    type(box, "mine\n");
    await editOutside(store, "b.md", "changed b\n");
    // Give the check time to run.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/outside the admin/)).toBeNull();
    expect(box.value).toBe("mine\n");
  });
});
