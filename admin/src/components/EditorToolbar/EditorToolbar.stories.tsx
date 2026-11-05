import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { EditorToolbar } from "./EditorToolbar.js";

const meta = {
  title: "Components/EditorToolbar",
  component: EditorToolbar,
  tags: ["autodocs"],
  args: { onAction: fn() },
} satisfies Meta<typeof EditorToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The formatting the text is in shows as pressed. */
export const WithPressedButtons: Story = {
  args: { active: new Set(["bold", "link"]) },
};

export const Clicking: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }));
    await expect(args.onAction).toHaveBeenCalledWith("bold");
    await userEvent.click(
      canvas.getByRole("button", { name: "Bulleted list" }),
    );
    await expect(args.onAction).toHaveBeenCalledWith("bullets");
  },
};

/** One Tab stop; the arrow keys move along the bar. */
export const WithTheKeyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Heading" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onAction).toHaveBeenCalledWith("heading");
  },
};
