// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { createFakeApi } from "./fake-api.js";
import { events, installFakeEvents } from "./fake-events.js";
import { editorText } from "./test-editor.js";
import { typeText } from "./test-typing.js";

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
  vi.stubGlobal("fetch", createFakeApi(files).fetch);
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
}

const hello = { "blog/hello.md": "# Hello\n" };

describe("Editor: the dev server's builds", () => {
  it("keeps the editor's text and shows no error after a reload", async () => {
    open("/pages/blog/hello.md", hello);
    const box = (await screen.findByLabelText("Markdown")) as HTMLElement;
    typeText(box, "# Hello\n\nMore");
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.reload());
    expect(box.isConnected).toBe(true);
    expect(editorText(box)).toBe("# Hello\n\nMore");
    expect(screen.queryByText("The site failed to build")).toBeNull();
  });

  it("shows a failed build", async () => {
    open("/pages/blog/hello.md", hello);
    await screen.findByLabelText("Markdown");
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.fail("site.yaml (theme.colours): unknown field"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("The site failed to build");
    expect(alert.textContent).toContain("site.yaml (theme.colours)");
  });

  it("clears the error when the next build is good", async () => {
    open("/pages/blog/hello.md", hello);
    await screen.findByLabelText("Markdown");
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.fail("bad"));
    await screen.findByRole("alert");
    act(() => events.reload());
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("opens the live page in a new tab from the Open page link", async () => {
    open("/pages/blog/hello.md", hello);
    const link = await screen.findByRole("link", { name: "Open page" });
    expect(link.getAttribute("href")).toBe("/blog/hello/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("links the home page as /", async () => {
    open("/pages/index.md", { "index.md": "# Home\n" });
    const link = await screen.findByRole("link", { name: "Open page" });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("has no Editor/Preview control", async () => {
    open("/pages/blog/hello.md", hello);
    await screen.findByLabelText("Markdown");
    expect(screen.queryByRole("radio", { name: "Preview" })).toBeNull();
  });
});

describe("Editor: without a dev server", () => {
  it("still opens the editor when there is no event stream", async () => {
    vi.stubGlobal("EventSource", undefined);
    open("/pages/blog/hello.md", hello);
    expect(await screen.findByLabelText("Markdown")).toBeDefined();
  });
});
