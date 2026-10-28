// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stubPages = () =>
  vi.stubGlobal("fetch", () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          pages: [{ path: "blog/hello.md", title: "Hello", version: "v" }],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    ),
  );

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe("App", () => {
  it("has a banner, a main landmark and a Pages heading", async () => {
    stubPages();
    open("/");
    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Pages");
    await screen.findByRole("link", { name: /Hello/ });
  });

  it("opens a page's route from the list, and goes back", async () => {
    stubPages();
    open("/");
    fireEvent.click(await screen.findByRole("link", { name: /Hello/ }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "blog/hello.md",
    );
    fireEvent.click(screen.getByRole("link", { name: "Back to all pages" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Pages");
  });

  it("opens a page's route directly, as on a reload", () => {
    stubPages();
    open("/pages/blog/hello.md");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "blog/hello.md",
    );
  });

  it("says when an address is unknown", () => {
    open("/nowhere");
    expect(screen.getByText(/nothing at this address/)).toBeDefined();
  });
});
