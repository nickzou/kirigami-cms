import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ConflictPanel } from "./ConflictPanel.js";

const meta = {
  title: "Components/ConflictPanel",
  component: ConflictPanel,
  tags: ["autodocs"],
  args: {
    gone: false,
    onLoadLatest: fn(),
    onCopy: fn(),
    onKeepEditing: fn(),
  },
} satisfies Meta<typeof ConflictPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PageChanged: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Load the latest/ }),
    );
    await expect(args.onLoadLatest).toHaveBeenCalledOnce();
  },
};

/** Nothing newer to load, so that choice is not offered. */
export const PageGone: Story = {
  args: { gone: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Load the latest/ }),
    ).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "Copy my text" }),
    ).toBeVisible();
  },
};
