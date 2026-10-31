import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { TextField } from "./TextField.js";

const meta = {
  title: "Components/TextField",
  component: TextField,
  tags: ["autodocs"],
  args: { label: "Name", placeholder: "hello" },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("Name");
    await userEvent.type(input, "hello");
    await expect(input).toHaveValue("hello");
  },
};

/** Fixed text after what is typed. It is not part of the value. */
export const WithSuffix: Story = {
  args: { suffix: ".md", mono: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("Name");
    await userEvent.type(input, "notes");
    await expect(input).toHaveValue("notes");
  },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "../outside" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "hello" },
};
