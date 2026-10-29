import type { Meta, StoryObj } from "@storybook/react-vite";
import { PreviewToggle } from "./PreviewToggle.js";

const meta = {
  title: "Components/PreviewToggle",
  component: PreviewToggle,
  tags: ["autodocs"],
  args: { onChange: () => {} },
} satisfies Meta<typeof PreviewToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Shown: Story = { args: { shown: true } };
export const Hidden: Story = { args: { shown: false } };
