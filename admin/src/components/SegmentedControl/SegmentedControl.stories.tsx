import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { SegmentedControl } from "./SegmentedControl.js";

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  args: {
    label: "View",
    options: [
      { value: "editor", label: "Editor" },
      { value: "preview", label: "Preview" },
    ],
    value: "editor",
    onChange: fn(),
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Editor: Story = {};
export const Preview: Story = { args: { value: "preview" } };
export const ThreeOptions: Story = {
  args: {
    options: [
      { value: "editor", label: "Editor" },
      { value: "preview", label: "Preview" },
      { value: "settings", label: "Settings" },
    ],
  },
};

/** Choosing a segment changes the value; this one keeps its own state to show it. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <SegmentedControl {...args} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "Editor" })).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Preview" }));
    await expect(canvas.getByRole("radio", { name: "Preview" })).toBeChecked();
    await expect(
      canvas.getByRole("radio", { name: "Editor" }),
    ).not.toBeChecked();
    // The highlight moves to the second segment (it slides there, in a browser).
    const highlight = canvasElement.querySelector<HTMLElement>(
      '[aria-hidden="true"]',
    );
    await expect(highlight?.style.transform).toBe(
      "translateX(calc(1 * (100% + 0.25rem)))",
    );
  },
};
