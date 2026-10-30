import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { RenameDialog } from "./RenameDialog.js";

const meta = {
  title: "Components/RenameDialog",
  component: RenameDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    path: "blog/hello.md",
    others: ["index.md", "about/index.md"],
    onRename: fn(async () => {}),
    onClose: fn(),
  },
} satisfies Meta<typeof RenameDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Nothing to do until the path changes, and the links note is shown.
    await expect(
      await canvas.findByRole("button", { name: "Rename" }),
    ).toBeDisabled();
    await expect(
      canvas.getByText("Links to this page in other pages are not updated."),
    ).toBeVisible();
  },
};

export const Renames: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByLabelText("Path");
    await userEvent.clear(input);
    await userEvent.type(input, "notes/hello");
    await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
    await waitFor(() =>
      expect(args.onRename).toHaveBeenCalledWith("notes/hello.md"),
    );
  },
};

export const SharedAddress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByLabelText("Path");
    await userEvent.clear(input);
    await userEvent.type(input, "about");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "about/index.md",
    );
  },
};
