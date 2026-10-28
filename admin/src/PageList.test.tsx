// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(links.map((l) => l.textContent)).toEqual([
      "Homeindex.md",
      "My postblog/my post.md",
    ]);
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
