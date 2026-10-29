import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LineEndingsNotice } from "../LineEndingsNotice/LineEndingsNotice.js";
import { EditorForm } from "./EditorForm.js";

const meta = {
  title: "Components/EditorForm",
  component: EditorForm,
  tags: ["autodocs"],
  args: {
    value: "# Hello\n\nSome **markdown**.\n",
    onChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof EditorForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithNotice: Story = {
  args: { notice: <LineEndingsNotice eol={"\r\n"} /> },
};

/** Typing changes the text; this one keeps its own state to show it. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <EditorForm {...args} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByLabelText("Markdown");
    await userEvent.type(box, " more");
    await expect(box).toHaveValue("# Hello\n\nSome **markdown**.\n more");
  },
};
