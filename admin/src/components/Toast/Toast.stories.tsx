import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Toast } from "./Toast.js";

const meta = {
  title: "Components/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Stays long enough here to look at it. */
export const Saved: Story = {
  args: { message: "Saved.", duration: 600000 },
};

export const Nothing: Story = { args: { message: null } };

/** It fades by itself, and the text is removed once it has gone. */
export const FadesByItself: Story = {
  args: { message: "Saved.", duration: 400 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Saved.")).toBeVisible();
    await waitFor(() => expect(canvas.queryByText("Saved.")).toBeNull(), {
      timeout: 2000,
    });
  },
};
