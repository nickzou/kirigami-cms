import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingMessage } from "./LoadingMessage.js";

const meta = {
  title: "Components/LoadingMessage",
  component: LoadingMessage,
  tags: ["autodocs"],
} satisfies Meta<typeof LoadingMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomText: Story = { args: { children: "Loading pages…" } };
