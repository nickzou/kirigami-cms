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
import { createFakeApi } from "./fake-api.js";
import { Settings } from "./Settings.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const FILE = [
  "# my theme",
  "theme:",
  "  colors:",
  '    link: "#9c27b0" # brand purple',
  "  layout:",
  "    maxWidth: 40rem",
  "",
].join("\n");

function show(files: Record<string, string> = {}) {
  const { store, fetch } = createFakeApi(files);
  vi.stubGlobal("fetch", fetch);
  // The unsaved-changes guard needs a data router.
  const router = createMemoryRouter([{ path: "*", element: <Settings /> }]);
  render(<RouterProvider router={router} />);
  return store;
}

const field = async (title: string) =>
  (await screen.findByLabelText(title)) as HTMLInputElement;
const save = () =>
  screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
const type = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } });
const previewHtml = () =>
  screen.getByTitle("Preview of the theme").getAttribute("srcdoc") ?? "";

describe("Settings: loading", () => {
  it("shows every theme setting in its section, with its default and what it is for", async () => {
    show();
    for (const heading of ["Colors", "Fonts", "Type", "Spacing", "Layout"]) {
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeDefined();
    }
    const link = await field("Links");
    expect(link.value).toBe("");
    expect(link.placeholder).toBe("#0b57d0");
    expect(screen.getAllByText(/^Default:/)).toHaveLength(14);
    expect(screen.getByText("The color of links.")).toBeDefined();
    expect(save().disabled).toBe(true);
  });

  it("shows the values the file sets, and a Reset for each", async () => {
    show({ "site.yaml": FILE });
    expect((await field("Links")).value).toBe("#9c27b0");
    expect((await field("Content width")).value).toBe("40rem");
    expect(screen.getByRole("button", { name: "Reset Links" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Reset Text" })).toBeNull();
  });

  it("says so, with a way to try again, when site.yaml is not valid", async () => {
    show({ "site.yaml": "nope: 1\n" });
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText(/Unknown key "nope"/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });
});

describe("Settings: editing and the live preview", () => {
  it("shows a change in the preview as it is typed, before anything is saved", async () => {
    const store = show();
    const link = await field("Links");
    expect(previewHtml()).toContain("--k-color-link: #0b57d0");
    type(link, "#112233");
    expect(previewHtml()).toContain("--k-color-link: #112233");
    expect(save().disabled).toBe(false);
    expect((await store.list()).map((e) => e.path)).toEqual([]);
  });

  it("changes a number setting in the preview too", async () => {
    show();
    type(await field("Line height"), "2");
    expect(previewHtml()).toContain("--k-line-height: 2");
  });

  it("explains a value that cannot be used, keeps the preview on the last good one, and blocks Save", async () => {
    show();
    const link = await field("Links");
    type(link, "#112233");
    type(link, "not a color!");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Enter a color",
    );
    expect(link.getAttribute("aria-invalid")).toBe("true");
    // The preview never uses a value the build would refuse.
    expect(previewHtml()).not.toContain("not a color!");
    expect(previewHtml()).toContain("--k-color-link: #0b57d0");
    expect(save().disabled).toBe(true);
  });

  it("checks a number's limits and a font list", async () => {
    show();
    type(await field("Heading scale"), "3");
    expect((await screen.findAllByRole("alert"))[0]?.textContent).toContain(
      "from 1 to 2",
    );
    type(await field("Body font"), "a; color: red");
    await waitFor(() =>
      expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(2),
    );
  });

  it("puts a picked color into the text", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("Pick a color for Links"), {
      target: { value: "#00ff00" },
    });
    expect((await field("Links")).value).toBe("#00ff00");
  });
});

describe("Settings: saving", () => {
  it("writes the change into site.yaml, keeping its comments and other settings", async () => {
    const store = show({ "site.yaml": FILE });
    type(await field("Links"), "#112233");
    fireEvent.click(save());
    expect(await screen.findByText("Saved.")).toBeDefined();
    expect((await store.read("site.yaml")).content).toBe(
      FILE.replace("#9c27b0", "#112233"),
    );
    // Nothing left to save.
    expect(save().disabled).toBe(true);
  });

  it("creates site.yaml when there was none", async () => {
    const store = show();
    type(await field("Content width"), "60ch");
    fireEvent.click(save());
    await screen.findByText("Saved.");
    expect((await store.read("site.yaml")).content).toBe(
      "theme:\n  layout:\n    maxWidth: 60ch\n",
    );
  });

  it("removes a setting with Reset, so the default applies", async () => {
    const store = show({ "site.yaml": FILE });
    await field("Links");
    fireEvent.click(
      screen.getByRole("button", { name: "Reset Content width" }),
    );
    expect((await field("Content width")).value).toBe("");
    fireEvent.click(save());
    await screen.findByText("Saved.");
    expect((await store.read("site.yaml")).content).toBe(
      [
        "# my theme",
        "theme:",
        "  colors:",
        '    link: "#9c27b0" # brand purple',
        "",
      ].join("\n"),
    );
  });

  it("treats emptying a field like Reset", async () => {
    const store = show({ "site.yaml": FILE });
    type(await field("Links"), "");
    fireEvent.click(save());
    await screen.findByText("Saved.");
    expect((await store.read("site.yaml")).content).not.toContain("link");
  });

  it("saves only what changed", async () => {
    const store = show({ "site.yaml": FILE });
    const before = (await store.read("site.yaml")).version;
    // Typing the same value is no change.
    type(await field("Links"), "#9c27b0");
    expect(save().disabled).toBe(true);
    expect((await store.read("site.yaml")).version).toBe(before);
  });

  it("says the file changed, offering the latest, when it was edited since it was read", async () => {
    const store = show({ "site.yaml": FILE });
    type(await field("Links"), "#112233");
    // Someone edits the file in another program.
    await store.write(
      "site.yaml",
      "theme:\n  layout:\n    maxWidth: 30rem\n",
      (await store.read("site.yaml")).version,
    );
    fireEvent.click(save());
    const panel = (
      await screen.findByText(/changed since you opened it/)
    ).closest("div") as HTMLElement;
    expect(panel).toBeDefined();
    // Nothing was written over their edit.
    expect((await store.read("site.yaml")).content).toContain("30rem");

    fireEvent.click(
      within(document.body).getByRole("button", {
        name: "Load the latest and discard my changes",
      }),
    );
    expect((await field("Content width")).value).toBe("30rem");
    expect((await field("Links")).value).toBe("");
  });
});
