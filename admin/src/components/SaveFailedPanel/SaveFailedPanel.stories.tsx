import type { Meta, StoryObj } from "@storybook/react-vite";
import { SaveFailedPanel } from "./SaveFailedPanel.js";

const meta = {
  title: "Components/SaveFailedPanel",
  component: SaveFailedPanel,
  tags: ["autodocs"],
  args: { message: "Failed to fetch" },
} satisfies Meta<typeof SaveFailedPanel>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
