import type { Meta, StoryObj } from "@storybook/react-vite";
import { SaveStatus } from "./SaveStatus.js";

const meta = {
  title: "Components/SaveStatus",
  component: SaveStatus,
  tags: ["autodocs"],
} satisfies Meta<typeof SaveStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = { args: { saved: true } };
export const Nothing: Story = { args: { saved: false } };
