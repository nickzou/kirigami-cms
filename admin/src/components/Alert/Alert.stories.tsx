import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./Alert.js";

const meta = {
  title: "Components/Alert",
  component: Alert,
  tags: ["autodocs"],
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Failure: Story = {
  args: { tone: "error", children: <p>Something went wrong.</p> },
};
export const Warning: Story = {
  args: { tone: "warning", children: <p>Heads up: this is only a warning.</p> },
};
