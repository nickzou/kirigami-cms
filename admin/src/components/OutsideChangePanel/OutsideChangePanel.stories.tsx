import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { OutsideChangePanel } from "./OutsideChangePanel.js";

const meta = {
  title: "Components/OutsideChangePanel",
  component: OutsideChangePanel,
  tags: ["autodocs"],
  args: {
    gone: false,
    onLoadLatest: fn(),
    onCopy: fn(),
    onKeepEditing: fn(),
  },
} satisfies Meta<typeof OutsideChangePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Changed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Load the latest and discard my changes",
      }),
    );
    await expect(args.onLoadLatest).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Keep editing" }));
    await expect(args.onKeepEditing).toHaveBeenCalled();
  },
};

/** Nothing newer to load, so only copying or keeping the text is offered. */
export const Gone: Story = { args: { gone: true } };
