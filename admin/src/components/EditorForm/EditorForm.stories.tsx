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
    dirty: false,
    saving: false,
  },
} satisfies Meta<typeof EditorForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Clean: Story = {};
export const Unsaved: Story = { args: { dirty: true } };
export const Saving: Story = { args: { dirty: true, saving: true } };
export const WithNotice: Story = {
  args: { dirty: true, notice: <LineEndingsNotice eol={"\r\n"} /> },
};

/** Typing makes the form dirty; this one keeps its own state to show it. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <EditorForm
        {...args}
        value={value}
        onChange={setValue}
        dirty={value !== args.value}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const save = canvas.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("Markdown"), " more");
    await expect(save).toBeEnabled();
    await expect(canvas.getByText("Unsaved changes")).toBeVisible();
  },
};
