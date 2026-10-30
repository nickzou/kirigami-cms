import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "../Button/Button.js";
import { Dialog } from "./Dialog.js";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    title: "A question",
    onClose: fn(),
    children: (
      <>
        <p className="mt-0">Whatever the dialog needs to say goes here.</p>
        <Button variant="primary">OK</Button>
      </>
    ),
  },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("dialog", { name: "A question" }),
    ).toBeVisible();
  },
};

/** A click on the dark area outside the dialog dismisses it. */
export const ClosesOnABackdropClick: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = await within(canvasElement).findByRole("dialog");
    await userEvent.click(dialog);
    await expect(args.onClose).toHaveBeenCalled();
  },
};
