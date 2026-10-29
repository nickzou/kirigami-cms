import type { Meta, StoryObj } from "@storybook/react-vite";
import { SaveControls } from "./SaveControls.js";

const meta = {
  title: "Components/SaveControls",
  component: SaveControls,
  tags: ["autodocs"],
  args: { dirty: false, saving: false, formId: "page-editor" },
} satisfies Meta<typeof SaveControls>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Clean: Story = {};
export const Unsaved: Story = { args: { dirty: true } };
export const Saving: Story = { args: { dirty: true, saving: true } };
