import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Editor } from "./Editor.js";
import { failures, installFakeApi } from "./fake-api.js";
import { events } from "./fake-events.js";

const meta = {
  title: "Screens/Editor",
  component: Editor,
  tags: ["autodocs"],
  args: { path: "blog/hello.md" },
} satisfies Meta<typeof Editor>;
export default meta;
type Story = StoryObj<typeof meta>;

const hello = { "blog/hello.md": "# Hello\n\nA page with **markdown**.\n" };

/** Types into the editor and presses Save. */
async function editAndSave(canvasElement: HTMLElement, extra = " More text.") {
  const canvas = within(canvasElement);
  const box = await canvas.findByLabelText("Markdown");
  await userEvent.type(box, extra);
  await userEvent.click(canvas.getByRole("button", { name: "Save" }));
  return canvas;
}

export const Default: Story = {
  beforeEach: () => installFakeApi(hello).restore,
};

export const Saves: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  play: async ({ canvasElement }) => {
    const canvas = await editAndSave(canvasElement);
    await waitFor(() => expect(canvas.getByText("Saved.")).toBeVisible());
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
  },
};

export const WindowsLineEndings: Story = {
  beforeEach: () =>
    installFakeApi({ "blog/hello.md": "# Hello  \r\n\r\nWindows file.\r\n" })
      .restore,
};

export const MixedLineEndings: Story = {
  beforeEach: () =>
    installFakeApi({ "blog/hello.md": "# Hello\r\n\r\nMixed\nendings.\r\n" })
      .restore,
};

export const PageChangedElsewhere: Story = {
  beforeEach: () => installFakeApi(hello, failures.conflictOnSave).restore,
  play: async ({ canvasElement }) => {
    const canvas = await editAndSave(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "changed since you opened it",
    );
  },
};

export const PageDeletedElsewhere: Story = {
  beforeEach: () => installFakeApi(hello, failures.goneOnSave).restore,
  play: async ({ canvasElement }) => {
    const canvas = await editAndSave(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "deleted or renamed",
    );
  },
};

export const SaveFails: Story = {
  beforeEach: () => installFakeApi(hello, failures.offlineSaves).restore,
  play: async ({ canvasElement }) => {
    const canvas = await editAndSave(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Could not save: Failed to fetch",
    );
  },
};

export const Loading: Story = {
  beforeEach: () => installFakeApi(hello, failures.never).restore,
};

export const LoadFails: Story = {
  beforeEach: () =>
    installFakeApi(hello, failures.serverError("Disk on fire")).restore,
};

export const MissingPage: Story = {
  args: { path: "nope.md" },
  beforeEach: () => installFakeApi(hello).restore,
};

/** Picks the Preview view, as a user does. */
async function showPreview(canvas: ReturnType<typeof within>) {
  await userEvent.click(await canvas.findByRole("radio", { name: "Preview" }));
  return canvas.findByTitle("Preview of blog/hello.md");
}

export const PreviewReloadsAfterABuild: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = await showPreview(canvas);
    await waitFor(() => expect(events.listeners()).toBe(1));
    events.reload();
    await waitFor(async () =>
      expect(await canvas.findByTitle("Preview of blog/hello.md")).not.toBe(
        before,
      ),
    );
  },
};

export const BuildFailed: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await showPreview(canvas);
    await waitFor(() => expect(events.listeners()).toBe(1));
    events.fail(
      "Cannot build the site:\n  site.yaml (theme.colours): unknown field",
    );
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "The site failed to build",
    );
  },
};

/** The control picks one view at a time, on a laptop and on a phone alike. */
export const SwitchesViews: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  parameters: { viewport: { defaultViewport: "laptop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Markdown")).toBeVisible();
    await expect(
      canvas.queryByTitle("Preview of blog/hello.md"),
    ).not.toBeInTheDocument();
    await expect(await showPreview(canvas)).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: "Editor" }));
    await expect(canvas.getByLabelText("Markdown")).toBeVisible();
    await expect(
      canvas.queryByTitle("Preview of blog/hello.md"),
    ).not.toBeInTheDocument();
  },
};

export const SwitchesViewsOnAPhone: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  parameters: { viewport: { defaultViewport: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("Markdown");
    await expect(await showPreview(canvas)).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: "Editor" }));
    await expect(canvas.getByLabelText("Markdown")).toBeVisible();
  },
};

/** The title is a field: type a new path and press Enter to rename. */
export const RenameFromTheTitle: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const path = await canvas.findByRole("textbox", { name: "Page path" });
    await userEvent.clear(path);
    await userEvent.type(path, "blog/renamed{Enter}");
    // Done when the field is free again (the app moves to the new address; a
    // story has no routes, so it stays where it is).
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Page path" })).toBeEnabled(),
    );
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** A path that is taken is refused as it is typed. */
export const RenameToATakenPath: Story = {
  beforeEach: () =>
    installFakeApi({ ...hello, "about.md": "# About\n" }).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const path = await canvas.findByRole("textbox", { name: "Page path" });
    await userEvent.clear(path);
    await userEvent.type(path, "about");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A page already exists at about.md.",
    );
  },
};

export const DeleteDialogOpen: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Delete" }),
    );
    await expect(
      await canvas.findByRole("dialog", { name: "Delete blog/hello.md?" }),
    ).toBeVisible();
  },
};

/** Moving or deleting a page with an unsaved draft would lose it, so both wait. */
export const RenameAndDeleteWaitForASave: Story = {
  beforeEach: () => installFakeApi(hello).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Markdown"), " more");
    await expect(
      canvas.getByRole("textbox", { name: "Page path" }),
    ).toHaveAttribute("readonly");
    await expect(canvas.getByRole("button", { name: "Delete" })).toBeDisabled();
  },
};
