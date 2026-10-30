import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ApiRequestError } from "../../api.js";
import { DeleteDialog } from "./DeleteDialog.js";

const meta = {
  title: "Components/DeleteDialog",
  component: DeleteDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    path: "blog/hello.md",
    onDelete: fn(async () => {}),
    onClose: fn(),
  },
} satisfies Meta<typeof DeleteDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** It names the page and says plainly that deleting cannot be undone. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("dialog", { name: "Delete blog/hello.md?" }),
    ).toBeVisible();
    await expect(canvas.getByText(/cannot be undone/)).toBeVisible();
  },
};

export const Deletes: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Delete page" }),
    );
    await waitFor(() => expect(args.onDelete).toHaveBeenCalled());
  },
};

export const Cancels: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Cancel" }),
    );
    await expect(args.onClose).toHaveBeenCalled();
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};

/** The page changed since it was read, so the server refused. */
export const ServerRefuses: Story = {
  args: {
    onDelete: fn(async () => {
      throw new ApiRequestError(
        "blog/hello.md changed since it was read (or already exists)",
        409,
        "conflict",
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Delete page" }),
    );
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "changed since it was read",
    );
  },
};
