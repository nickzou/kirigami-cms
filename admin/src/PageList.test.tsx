// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeApi } from "./fake-api.js";
import { PageList } from "./PageList.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const respond = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

const show = () =>
  render(
    <MemoryRouter>
      <PageList />
    </MemoryRouter>,
  );

describe("PageList", () => {
  it("shows a status while loading", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    show();
    expect(screen.getByRole("status").textContent).toContain("Loading");
  });

  it("lists pages with title and path, linking to each editor route", async () => {
    vi.stubGlobal("fetch", () =>
      respond({
        pages: [
          { path: "index.md", title: "Home", version: "a" },
          { path: "blog/my post.md", title: "My post", version: "b" },
        ],
      }),
    );
    show();
    const links = await screen.findAllByRole("link");
    // Top-level pages first, then the folders; each shows its title.
    expect(links.map((l) => l.textContent)).toEqual(["Home", "My post"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/pages/index.md",
      "/pages/blog/my%20post.md",
    ]);
  });

  it("says so when there are no pages", async () => {
    vi.stubGlobal("fetch", () => respond({ pages: [] }));
    show();
    expect((await screen.findByText(/no pages yet/)).textContent).toContain(
      "This site has no pages yet.",
    );
  });

  it("shows the server's message on failure and retries on request", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", () => {
      calls += 1;
      return calls === 1
        ? respond({ error: { code: "x", message: "Disk on fire" } }, 500)
        : respond({ pages: [{ path: "a.md", title: "A", version: "v" }] });
    });
    show();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Disk on fire");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link")).toBeDefined();
    expect(calls).toBe(2);
  });

  it("shows a message when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.reject(new TypeError("Failed to fetch")),
    );
    show();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Failed to fetch",
    );
  });
});

/** Where the router is, so a test can see that a page was opened. */
function Here() {
  return <p data-testid="here">{useLocation().pathname}</p>;
}

function manage(files: Record<string, string>) {
  const { store, fetch } = createFakeApi(files);
  vi.stubGlobal("fetch", fetch);
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<PageList />} />
        <Route path="/pages/*" element={<Here />} />
      </Routes>
    </MemoryRouter>,
  );
  return store;
}

const pathsOf = async (store: ReturnType<typeof manage>) =>
  (await store.list()).map((entry) => entry.path);

describe("PageList: new page", () => {
  it("creates a page with a starter heading and opens it in the editor", async () => {
    const store = manage({ "index.md": "# Home\n" });
    fireEvent.click(await screen.findByRole("button", { name: "New page" }));
    fireEvent.change(await screen.findByLabelText("Path"), {
      target: { value: "blog/hello-world" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(screen.getByTestId("here").textContent).toBe(
        "/pages/blog/hello-world.md",
      ),
    );
    expect((await store.read("blog/hello-world.md")).content).toBe(
      "# Hello world\n",
    );
  });

  it("warns, and will not create, when the path is taken or shares an address", async () => {
    const store = manage({
      "index.md": "# Home\n",
      "about/index.md": "# About\n",
    });
    fireEvent.click(await screen.findByRole("button", { name: "New page" }));
    const path = await screen.findByLabelText("Path");
    const create = screen.getByRole("button", {
      name: "Create",
    }) as HTMLButtonElement;

    fireEvent.change(path, { target: { value: "index" } });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "already exists",
    );
    expect(create.disabled).toBe(true);

    fireEvent.change(path, { target: { value: "about" } });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("about/index.md"),
    );
    expect(create.disabled).toBe(true);
    expect(await pathsOf(store)).toEqual(["about/index.md", "index.md"]);
  });

  it("closes without creating anything when cancelled", async () => {
    const store = manage({ "index.md": "# Home\n" });
    fireEvent.click(await screen.findByRole("button", { name: "New page" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await pathsOf(store)).toEqual(["index.md"]);
  });
});

describe("PageList: rename", () => {
  it("moves the page and shows it at its new path, saying links are not updated", async () => {
    const store = manage({ "a.md": "# A\n", "b.md": "# B\n" });
    fireEvent.click(await screen.findByRole("button", { name: "Rename a.md" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Links to this page/)).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText("Path"), {
      target: { value: "notes/a" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await pathsOf(store)).toEqual(["b.md", "notes/a.md"]);
    expect(
      (await screen.findAllByRole("link")).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual(["/pages/b.md", "/pages/notes/a.md"]);
  });

  it("cannot rename onto a page that exists, and keeps both", async () => {
    const store = manage({ "a.md": "# A\n", "b.md": "# B\n" });
    fireEvent.click(await screen.findByRole("button", { name: "Rename a.md" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Path"), {
      target: { value: "b" },
    });
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "A page already exists at b.md.",
    );
    expect(
      (
        within(dialog).getByRole("button", {
          name: "Rename",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(await pathsOf(store)).toEqual(["a.md", "b.md"]);
  });

  it("shows what the server refuses, such as a page that changed meanwhile", async () => {
    const store = manage({ "a.md": "# A\n" });
    fireEvent.click(await screen.findByRole("button", { name: "Rename a.md" }));
    const dialog = await screen.findByRole("dialog");
    // Someone else edits the page after the list was loaded.
    await store.write(
      "a.md",
      "# Changed\n",
      (await store.read("a.md")).version,
    );
    fireEvent.change(within(dialog).getByLabelText("Path"), {
      target: { value: "z" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "changed since it was read",
    );
    expect(await pathsOf(store)).toEqual(["a.md"]);
  });
});

describe("PageList: delete", () => {
  it("names the page, says it cannot be undone, and deletes it when confirmed", async () => {
    const store = manage({ "a.md": "# A\n", "b.md": "# B\n" });
    fireEvent.click(await screen.findByRole("button", { name: "Delete a.md" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete a.md?" });
    expect(within(dialog).getByText(/cannot be undone/)).toBeDefined();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete page" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await pathsOf(store)).toEqual(["b.md"]);
    expect(
      (await screen.findAllByRole("link")).map((link) => link.textContent),
    ).toEqual(["B"]);
  });

  it("keeps the page when cancelled", async () => {
    const store = manage({ "a.md": "# A\n" });
    fireEvent.click(await screen.findByRole("button", { name: "Delete a.md" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await pathsOf(store)).toEqual(["a.md"]);
  });

  it("keeps the page and says so when it changed since the list was read", async () => {
    const store = manage({ "a.md": "# A\n" });
    fireEvent.click(await screen.findByRole("button", { name: "Delete a.md" }));
    await store.write(
      "a.md",
      "# Changed\n",
      (await store.read("a.md")).version,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Delete page" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "changed since it was read",
    );
    expect(await pathsOf(store)).toEqual(["a.md"]);
  });
});
