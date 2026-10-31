import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { NewPageDialog } from "./NewPageDialog.js";

const meta = {
  title: "Components/NewPageDialog",
  component: NewPageDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    others: ["index.md", "about/index.md", "blog/hello.md"],
    onCreate: fn(async () => {}),
    onClose: fn(),
  },
} satisfies Meta<typeof NewPageDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `.md` is added, so it is not typed. */
export const Creates: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Name"), "second");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(args.onCreate).toHaveBeenCalledWith("second.md"),
    );
  },
};

/** "New folder…" asks for the folder's name; the page goes in it. */
export const MakesANewFolder: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      await canvas.findByLabelText("Folder"),
      "New folder…",
    );
    const folder = await canvas.findByLabelText("New folder name");
    await expect(folder).toHaveFocus();
    await userEvent.type(folder, "drafts");
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("Name"), "hello");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(args.onCreate).toHaveBeenCalledWith("drafts/hello.md"),
    );
  },
};

/** The page's name takes no folder: that is what the Folder select is for. */
export const SlashInNameIsRefused: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Name"), "blog/second");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "cannot contain a slash",
    );
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};

export const PathTaken: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      await canvas.findByLabelText("Folder"),
      "blog",
    );
    await userEvent.type(canvas.getByLabelText("Name"), "hello");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A page already exists at blog/hello.md.",
    );
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};

/** `about.md` and `about/index.md` would be shown at the same address. */
export const SharedAddress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Name"), "about");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "about/index.md",
    );
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};

export const InvalidPath: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      await canvas.findByLabelText("Folder"),
      "New folder…",
    );
    await userEvent.type(await canvas.findByLabelText("New folder name"), "..");
    await userEvent.type(canvas.getByLabelText("Name"), "outside");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "not allowed",
    );
  },
};

/** The server can refuse what the page could not tell (say, a page added meanwhile). */
export const ServerRefuses: Story = {
  args: {
    onCreate: fn(async () => {
      const { ApiRequestError } = await import("../../api.js");
      throw new ApiRequestError(
        "A page already exists at new.md.",
        409,
        "exists",
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Name"), "new");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A page already exists at new.md.",
    );
  },
};

/** The folders there are can be picked, so only the name is typed. */
export const PicksAFolder: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      await canvas.findByLabelText("Folder"),
      "blog",
    );
    await userEvent.type(canvas.getByLabelText("Name"), "second");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(args.onCreate).toHaveBeenCalledWith("blog/second.md"),
    );
  },
};

/** Opened from a folder, it starts in that folder. */
export const StartsInAFolder: Story = {
  args: { folder: "blog" },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByLabelText("Folder"),
    ).toHaveValue("blog");
  },
};

/** Typing the extension changes nothing: it is already there. */
export const ExtensionIsFixed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Name"), "notes.md");
    await expect(canvas.getByLabelText("Name")).toHaveValue("notes");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(args.onCreate).toHaveBeenCalledWith("notes.md"));
  },
};
