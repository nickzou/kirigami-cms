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
  vi.stubGlobal("fetch", createFakeApi(files).fetch);
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
}

const frame = () =>
  screen.findByTitle("Preview of blog/hello.md") as Promise<HTMLIFrameElement>;
const hello = { "blog/hello.md": "# Hello\n" };

describe("Editor: preview", () => {
  it("shows the page's real address in a fully sandboxed frame", async () => {
    open("/pages/blog/hello.md", hello);
    const iframe = await frame();
    expect(iframe.getAttribute("src")).toBe("/blog/hello/");
    // An empty sandbox: no scripts, so the dev live-reload script cannot run.
    expect(iframe.getAttribute("sandbox")).toBe("");
  });

  it("uses / for the home page", async () => {
    open("/pages/index.md", { "index.md": "# Home\n" });
    expect(
      (await screen.findByTitle("Preview of index.md")).getAttribute("src"),
    ).toBe("/");
  });

  it("loads the preview again, as a new frame, after a good build", async () => {
    open("/pages/blog/hello.md", hello);
    const before = await frame();
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.reload());
    await waitFor(async () => expect(await frame()).not.toBe(before));
    expect(before.isConnected).toBe(false);
  });

  it("keeps the editor's text and shows no error after a reload", async () => {
    open("/pages/blog/hello.md", hello);
    const box = (await screen.findByLabelText(
      "Markdown",
    )) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "# Hello\n\nMore" } });
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.reload());
    expect(box.isConnected).toBe(true);
    expect(box.value).toBe("# Hello\n\nMore");
    expect(screen.queryByText("The site failed to build")).toBeNull();
  });

  it("shows a failed build and leaves the preview as it was", async () => {
    open("/pages/blog/hello.md", hello);
    const before = await frame();
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.fail("site.yaml (theme.colours): unknown field"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("The site failed to build");
    expect(alert.textContent).toContain("site.yaml (theme.colours)");
    expect(await frame()).toBe(before);
  });

  it("clears the error when the next build is good, and reloads the preview", async () => {
    open("/pages/blog/hello.md", hello);
    const before = await frame();
    await waitFor(() => expect(events.listeners()).toBe(1));
    act(() => events.fail("bad"));
    await screen.findByRole("alert");
    act(() => events.reload());
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(await frame()).not.toBe(before);
  });

  it("hides and shows the preview with the toggle", async () => {
    open("/pages/blog/hello.md", hello);
    await frame();
    const toggle = screen.getByRole("button", { name: "Preview" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggle);
    expect(screen.queryByTitle("Preview of blog/hello.md")).toBeNull();
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);
    expect(await frame()).toBeDefined();
  });
});

describe("Editor: preview without a dev server", () => {
  it("still opens the editor when there is no event stream", async () => {
    vi.stubGlobal("EventSource", undefined);
    open("/pages/blog/hello.md", hello);
    expect(await screen.findByLabelText("Markdown")).toBeDefined();
  });
});
