import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Select } from "./Select.js";

const meta = {
  title: "Components/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    label: "Folder",
    children: (
      <>
        <option value="">Top level</option>
        <option value="blog">blog</option>
        <option value="docs">docs</option>
        <option value="docs/guides">docs/guides</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByLabelText("Folder");
    await userEvent.selectOptions(select, "docs");
    await expect(select).toHaveValue("docs");
  },
};

export const Disabled: Story = { args: { disabled: true } };
