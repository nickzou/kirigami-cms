import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { failures, installFakeApi } from "./fake-api.js";
import { Settings } from "./Settings.js";

const meta = {
  title: "Screens/Settings",
  component: Settings,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Settings>;
export default meta;
type Story = StoryObj<typeof meta>;

const FILE = [
  "# my theme",
  "theme:",
  "  colors:",
  '    link: "#9c27b0" # brand purple',
  "  layout:",
  "    maxWidth: 40rem",
  "",
].join("\n");

/** A site that already sets a few things; the rest shows its default. */
export const Default: Story = {
  beforeEach: () => installFakeApi({ "site.yaml": FILE }).restore,
};

/** No site.yaml yet: every setting is at its default. */
export const NoFile: Story = {
  beforeEach: () => installFakeApi({}).restore,
};

/** Changing a value updates the preview at once; nothing is written until Save. */
export const EditsAndSaves: Story = {
  beforeEach: () => installFakeApi({ "site.yaml": FILE }).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = await canvas.findByLabelText("Links");
    await userEvent.clear(link);
    await userEvent.type(link, "#112233");
    await expect(
      canvas.getByTitle("Preview of the theme").getAttribute("srcdoc"),
    ).toContain("--k-color-link: #112233");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(canvas.getByText("Saved.")).toBeVisible());
  },
};

export const InvalidValue: Story = {
  beforeEach: () => installFakeApi({}).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Links"), "not a color!");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Enter a color",
    );
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
  },
};

/** site.yaml has a mistake, so there is nothing safe to edit: the screen says what it is. */
export const InvalidFile: Story = {
  beforeEach: () => installFakeApi({ "site.yaml": "nope: 1\n" }).restore,
};

export const SaveFails: Story = {
  beforeEach: () => installFakeApi({}, failures.offlineSaves).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Links"), "#112233");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText(/Could not save/)).toBeVisible();
  },
};

export const FileChangedMeanwhile: Story = {
  beforeEach: () => {
    const { store, restore } = installFakeApi({ "site.yaml": FILE });
    // Edited by another program after the screen loads.
    (globalThis as { __editSite?: () => Promise<void> }).__editSite =
      async () => {
        await store.write(
          "site.yaml",
          "theme:\n  layout:\n    maxWidth: 30rem\n",
          (await store.read("site.yaml")).version,
        );
      };
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Heading scale"), "1.5");
    await (globalThis as { __editSite?: () => Promise<void> }).__editSite?.();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(
      await canvas.findByText(/changed since you opened it/),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: () => installFakeApi({}, failures.never).restore,
};

export const LoadFails: Story = {
  beforeEach: () =>
    installFakeApi({}, failures.serverError("Disk on fire")).restore,
};

/** On a phone one of the two shows at a time, switched by the control at the bottom. */
export const OnAPhone: Story = {
  beforeEach: () => installFakeApi({ "site.yaml": FILE }).restore,
  parameters: { viewport: { defaultViewport: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("Links");
    await userEvent.click(canvas.getByRole("radio", { name: "Preview" }));
    await expect(canvas.getByTitle("Preview of the theme")).toBeVisible();
  },
};
