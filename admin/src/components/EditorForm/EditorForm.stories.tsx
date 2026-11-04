import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { defaultTheme } from "../../editor-theme.js";
import { appendText, editorText } from "../../test-editor.js";
import { LineEndingsNotice } from "../LineEndingsNotice/LineEndingsNotice.js";
import { EditorForm } from "./EditorForm.js";

const meta = {
  title: "Components/EditorForm",
  component: EditorForm,
  tags: ["autodocs"],
  args: {
    value: "# Hello\n\nSome **markdown**.\n",
    theme: defaultTheme(),
    onChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof EditorForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Until the site's theme is known there is nothing to show the text in. */
export const LoadingTheme: Story = { args: { theme: undefined } };
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
    appendText(box, " more");
    await expect(editorText(box)).toBe("# Hello\n\nSome **markdown**.\n more");
  },
};
