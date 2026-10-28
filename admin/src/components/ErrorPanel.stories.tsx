import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ErrorPanel } from "./ErrorPanel.js";

const meta = {
  title: "Components/ErrorPanel",
  component: ErrorPanel,
  tags: ["autodocs"],
  args: { message: "Could not load the pages: Failed to fetch" },
} satisfies Meta<typeof ErrorPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithRetry: Story = { args: { onRetry: fn() } };
export const WithoutRetry: Story = {
  args: { message: "This page does not exist." },
};
