// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { createFakeApi, type FetchLike } from "./fake-api.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The real pages API over an in-memory store, as `fetch` for the app. */
function serve(
  files: Record<string, string>,
  wrap?: (real: FetchLike) => FetchLike,
) {
  const { store, fetch } = createFakeApi(files, wrap);
  vi.stubGlobal("fetch", fetch);
  return store;
}

function open(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
}

const editor = () =>
  screen.findByLabelText("Markdown") as Promise<HTMLTextAreaElement>;
const type = (box: HTMLTextAreaElement, value: string) =>
  fireEvent.change(box, { target: { value } });
/** The page's path, which is the title: a text field in the header, without its `.md`. */
const pagePath = () =>
  screen.getByRole("textbox", { name: "Page path" }) as HTMLInputElement;
const saveButton = () =>
  screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;

describe("Editor: loading", () => {
  it("shows the page's markdown in a labelled textarea, with nothing to save", async () => {
    serve({ "blog/hello.md": "# Hello\n\nText\n" });
    open("/pages/blog/hello.md");
    expect((await editor()).value).toBe("# Hello\n\nText\n");
    expect(pagePath().value).toBe("blog/hello");
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText("No changes")).toBeDefined();
  });

  it("puts the cursor in the text when the bare sheet is clicked", async () => {
    serve({ "blog/hello.md": "# Hello\n" });
    open("/pages/blog/hello.md");
    const box = await editor();
    expect(document.activeElement).not.toBe(box);

    // The sheet is the page the text sits on; a click on it, not on a control.
    fireEvent.click(
      box.closest("form")?.parentElement?.parentElement as HTMLElement,
    );
    expect(document.activeElement).toBe(box);
    expect(box.selectionStart).toBe(box.value.length);
  });

  it("does not take the focus when a control on the sheet is clicked", async () => {
    serve({ "blog/hello.md": "# Hello\n" });
    open("/pages/blog/hello.md");
    const box = await editor();
    fireEvent.click(screen.getByRole("link", { name: "Back to all pages" }));
    expect(document.activeElement).not.toBe(box);
  });

  it("opens a page whose name has a space", async () => {
    serve({ "my post.md": "# Mine\n" });
    open("/pages/my%20post.md");
    expect((await editor()).value).toBe("# Mine\n");
  });

  it("says so when the page does not exist, with no retry button", async () => {
    serve({});
    open("/pages/nope.md");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "does not exist",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Back to all pages" }),
    ).toBeDefined();
  });

  it("shows a server error and retries on request", async () => {
    let fail = true;
    serve(
      { "a.md": "# A\n" },
      (real) => (input, init) =>
        fail
          ? Promise.resolve(
              new Response(
                JSON.stringify({
                  error: { code: "x", message: "Disk on fire" },
                }),
                {
                  status: 500,
                },
              ),
            )
          : real(input, init),
    );
    open("/pages/a.md");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Disk on fire",
    );
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect((await editor()).value).toBe("# A\n");
  });
});

describe("Editor: saving", () => {
  it("enables Save once the text changes, saves it, and says so", async () => {
    const store = serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    const box = await editor();

    type(box, "# A\n\nMore\n");
    expect(saveButton().disabled).toBe(false);
    expect(screen.getByText("Unsaved changes")).toBeDefined();

    fireEvent.click(saveButton());
    // It shows in the live region, which announces it.
    expect(
      (await screen.findByText("Saved.")).closest('[role="status"]'),
    ).not.toBeNull();
    expect((await store.read("a.md")).content).toBe("# A\n\nMore\n");
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText("No changes")).toBeDefined();
  });

  it("uses the new version for the next save", async () => {
    const store = serve({ "a.md": "one" });
    open("/pages/a.md");
    const box = await editor();

    type(box, "two");
    fireEvent.click(saveButton());
    await waitFor(async () =>
      expect((await store.read("a.md")).content).toBe("two"),
    );
    await screen.findByText("Saved.");

    type(box, "three");
    fireEvent.click(saveButton());
    await waitFor(async () =>
      expect((await store.read("a.md")).content).toBe("three"),
    );
  });

  it("saves with Ctrl+S and with Cmd+S", async () => {
    const store = serve({ "a.md": "one" });
    open("/pages/a.md");
    const box = await editor();

    type(box, "two");
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(async () =>
      expect((await store.read("a.md")).content).toBe("two"),
    );
    await screen.findByText("Saved.");

    type(box, "three");
    fireEvent.keyDown(window, { key: "S", metaKey: true });
    await waitFor(async () =>
      expect((await store.read("a.md")).content).toBe("three"),
    );
  });

  it("keeps the text and offers another try when saving fails", async () => {
    let offline = true;
    const store = serve(
      { "a.md": "one" },
      (real) => (input, init) =>
        offline && init?.method === "PUT"
          ? Promise.reject(new TypeError("Failed to fetch"))
          : real(input, init),
    );
    open("/pages/a.md");
    const box = await editor();

    type(box, "two");
    fireEvent.click(saveButton());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not save: Failed to fetch",
    );
    expect(box.value).toBe("two");
    expect((await store.read("a.md")).content).toBe("one");

    offline = false;
    fireEvent.click(saveButton());
    await waitFor(async () =>
      expect((await store.read("a.md")).content).toBe("two"),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Editor: markdown stays byte-for-byte", () => {
  const crlf = "# Title  \r\n\r\n<b>raw</b>  \r\n\ttabbed\r\n";

  it("does not offer to save a CRLF page nobody touched", async () => {
    const store = serve({ "a.md": crlf });
    open("/pages/a.md");
    await editor();
    expect(saveButton().disabled).toBe(true);
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect((await store.read("a.md")).content).toBe(crlf);
  });

  it("keeps CRLF, trailing spaces, tabs and raw HTML when a character changes", async () => {
    const store = serve({ "a.md": crlf });
    open("/pages/a.md");
    const box = await editor();
    type(box, box.value.replace("Title", "Titles"));
    fireEvent.click(saveButton());
    await screen.findByText("Saved.");
    expect((await store.read("a.md")).content).toBe(
      crlf.replace("Title", "Titles"),
    );
  });

  it("keeps LF pages as LF", async () => {
    const store = serve({ "a.md": "a  \nb\n" });
    open("/pages/a.md");
    const box = await editor();
    type(box, "a  \nb\nc\n");
    fireEvent.click(saveButton());
    await screen.findByText("Saved.");
    expect((await store.read("a.md")).content).toBe("a  \nb\nc\n");
  });

  it("warns when a page mixes line endings, naming what saving will use", async () => {
    serve({ "a.md": "a\r\nb\nc\r\n" });
    open("/pages/a.md");
    await editor();
    expect(screen.getByText(/mixes line endings/).textContent).toContain(
      "Windows (CRLF)",
    );
  });
});

describe("Editor: conflicts", () => {
  async function conflicted() {
    const store = serve({ "a.md": "v1" });
    open("/pages/a.md");
    const box = await editor();
    const { version } = await store.read("a.md");
    await store.write("a.md", "changed elsewhere", version);
    type(box, "my edit");
    fireEvent.click(saveButton());
    await screen.findByRole("alert");
    return { store, box };
  }

  it("writes nothing, keeps my text, and says what happened", async () => {
    const { store, box } = await conflicted();
    expect(screen.getByRole("alert").textContent).toContain(
      "changed since you opened it",
    );
    expect(box.value).toBe("my edit");
    expect((await store.read("a.md")).content).toBe("changed elsewhere");
  });

  it("loads the latest version and discards my changes on request", async () => {
    await conflicted();
    fireEvent.click(screen.getByRole("button", { name: /Load the latest/ }));
    await waitFor(async () =>
      expect(((await editor()) as HTMLTextAreaElement).value).toBe(
        "changed elsewhere",
      ),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("lets me keep editing, and a later save still cannot overwrite", async () => {
    const { store, box } = await conflicted();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(box.value).toBe("my edit");

    fireEvent.click(saveButton());
    await screen.findByRole("alert");
    expect((await store.read("a.md")).content).toBe("changed elsewhere");
  });

  it("selects my text for copying when the clipboard is unavailable", async () => {
    const { box } = await conflicted();
    const select = vi.spyOn(box, "select");
    fireEvent.click(screen.getByRole("button", { name: "Copy my text" }));
    await waitFor(() => expect(select).toHaveBeenCalled());
  });

  it("explains a deleted page and offers no reload", async () => {
    serve(
      { "a.md": "v1" },
      (real) => (input, init) =>
        init?.method === "PUT"
          ? Promise.resolve(
              new Response(
                JSON.stringify({
                  error: { code: "conflict", message: "gone" },
                  currentVersion: null,
                }),
                { status: 409 },
              ),
            )
          : real(input, init),
    );
    open("/pages/a.md");
    type(await editor(), "my edit");
    fireEvent.click(saveButton());
    expect((await screen.findByRole("alert")).textContent).toContain(
      "deleted or renamed",
    );
    expect(
      screen.queryByRole("button", { name: /Load the latest/ }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Copy my text" })).toBeDefined();
  });
});

describe("Editor: unsaved changes guard", () => {
  it("asks before leaving, and stays when I say no", async () => {
    serve({ "a.md": "one" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    open("/pages/a.md");
    const box = await editor();
    type(box, "two");

    fireEvent.click(screen.getByRole("link", { name: "Back to all pages" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(pagePath().value).toBe("a");
    expect(box.value).toBe("two");
  });

  it("leaves when I say yes", async () => {
    serve({ "a.md": "one" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    open("/pages/a.md");
    type(await editor(), "two");

    fireEvent.click(screen.getByRole("link", { name: "Back to all pages" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Pages",
      ),
    );
  });

  it("does not ask when nothing changed, or after saving", async () => {
    serve({ "a.md": "one" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    open("/pages/a.md");
    const box = await editor();

    type(box, "two");
    fireEvent.click(saveButton());
    await screen.findByText("Saved.");

    fireEvent.click(screen.getByRole("link", { name: "Back to all pages" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Pages",
      ),
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm closing the tab only while there are unsaved changes", async () => {
    serve({ "a.md": "one" });
    open("/pages/a.md");
    const box = await editor();
    const closing = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(closing()).toBe(false);
    type(box, "two");
    await waitFor(() => expect(closing()).toBe(true));
    fireEvent.click(saveButton());
    await screen.findByText("Saved.");
    expect(closing()).toBe(false);
  });
});

describe("Editor: rename and delete", () => {
  it("renames the page from the title field and opens it at its new path", async () => {
    const store = serve({ "blog/hello.md": "# Hello\n" });
    open("/pages/blog/hello.md");
    await editor();
    fireEvent.change(pagePath(), { target: { value: "blog/renamed" } });
    fireEvent.keyDown(pagePath(), { key: "Enter" });
    await waitFor(() => expect(pagePath().value).toBe("blog/renamed"));
    expect((await editor()).value).toBe("# Hello\n");
    expect((await store.list()).map((e) => e.path)).toEqual([
      "blog/renamed.md",
    ]);
  });

  it("renames when the field is left, and puts the path back on Escape", async () => {
    const store = serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    await editor();
    fireEvent.change(pagePath(), { target: { value: "nope" } });
    fireEvent.keyDown(pagePath(), { key: "Escape" });
    expect(pagePath().value).toBe("a");
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);

    fireEvent.change(pagePath(), { target: { value: "b" } });
    fireEvent.blur(pagePath());
    await waitFor(() => expect(pagePath().value).toBe("b"));
    expect((await store.list()).map((e) => e.path)).toEqual(["b.md"]);
  });

  it("keeps the .md extension out of the field, and on the page", async () => {
    const store = serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    await editor();
    expect(screen.getByText(".md")).toBeDefined();
    // Typing the extension changes nothing: it is already there.
    fireEvent.change(pagePath(), { target: { value: "notes/b.md" } });
    expect(pagePath().value).toBe("notes/b");
    fireEvent.keyDown(pagePath(), { key: "Enter" });
    await waitFor(() => expect(pagePath().value).toBe("notes/b"));
    expect((await store.list()).map((e) => e.path)).toEqual(["notes/b.md"]);
  });

  it("says that links to the page are not updated, while a new path waits", async () => {
    serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    await editor();
    expect(screen.queryByText(/Links to this page/)).toBeNull();
    fireEvent.change(pagePath(), { target: { value: "b" } });
    expect(
      (await screen.findByText(/Links to this page/, {}, { timeout: 4000 }))
        .textContent,
    ).toBe("Links to this page in other pages are not updated.");
    // Back to the old path: nothing to say.
    fireEvent.change(pagePath(), { target: { value: "a" } });
    expect(screen.queryByText(/Links to this page/)).toBeNull();
  });

  it("warns about a path another page has, once the other pages are known", async () => {
    const store = serve({ "a.md": "# A\n", "b.md": "# B\n" });
    open("/pages/a.md");
    await editor();
    fireEvent.focus(pagePath());
    fireEvent.change(pagePath(), { target: { value: "b" } });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "A page already exists at b.md.",
    );
    // It is not renamed, and the reason stays while the path is wrong.
    fireEvent.keyDown(pagePath(), { key: "Enter" });
    expect(pagePath().value).toBe("b");
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md", "b.md"]);
  });

  it("shows what the server refuses, such as a page that changed meanwhile", async () => {
    const store = serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    await editor();
    // Someone else edits the page after it was loaded.
    await store.write(
      "a.md",
      "# Changed\n",
      (await store.read("a.md")).version,
    );
    fireEvent.change(pagePath(), { target: { value: "z" } });
    fireEvent.keyDown(pagePath(), { key: "Enter" });
    expect(
      (await screen.findByRole("alert", {}, { timeout: 4000 })).textContent,
    ).toContain("changed since it was read");
    expect(pagePath().value).toBe("z");
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
  });

  it("cannot rename or delete while there are unsaved changes", async () => {
    serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    type(await editor(), "# A\n\nmore");
    const remove = screen.getByRole("button", {
      name: "Delete",
    }) as HTMLButtonElement;
    expect(pagePath().readOnly).toBe(true);
    expect(pagePath().title).toBe("Save your changes first.");
    expect(remove.disabled).toBe(true);
  });

  it("asks before deleting, then deletes the page and goes back to the list", async () => {
    const store = serve({ "a.md": "# A\n", "b.md": "# B\n" });
    open("/pages/a.md");
    await editor();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete a.md?" });
    expect(within(dialog).getByText(/cannot be undone/)).toBeDefined();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete page" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Pages",
      ),
    );
    expect((await store.list()).map((e) => e.path)).toEqual(["b.md"]);
  });

  it("keeps the page when the delete dialog is cancelled", async () => {
    const store = serve({ "a.md": "# A\n" });
    open("/pages/a.md");
    await editor();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
  });
});
