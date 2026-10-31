import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { RenameDialog } from "./RenameDialog.js";

const meta = {
  title: "Components/RenameDialog",
  component: RenameDialog,
  tags: ["autodocs"],
  args: {
    path: "blog/hello.md",
    others: ["index.md", "blog/other.md"],
    onRename: fn(async () => {}),
    onClose: fn(),
  },
} satisfies Meta<typeof RenameDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Renames: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const field = await canvas.findByLabelText("New path");
    await expect(field).toHaveValue("blog/hello");
    await userEvent.clear(field);
    await userEvent.type(field, "blog/renamed");
    await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
    await expect(args.onRename).toHaveBeenCalledWith("blog/renamed.md");
  },
};

export const TakenPath: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = await canvas.findByLabelText("New path");
    await userEvent.clear(field);
    await userEvent.type(field, "index");
    await expect(await canvas.findByRole("alert")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Rename" })).toBeDisabled();
  },
};

export const Unchanged: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("New path");
    await expect(canvas.getByRole("button", { name: "Rename" })).toBeDisabled();
  },
};

export const Refused: Story = {
  args: {
    onRename: fn(async () => {
      throw new Error("no");
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = await canvas.findByLabelText("New path");
    await userEvent.type(field, "x");
    await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(canvas.getByRole("alert")).toBeVisible());
  },
};
