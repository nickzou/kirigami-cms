import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, within } from "storybook/test";
import { appendText, editorText } from "../../test-editor.js";
import { MarkdownEditor } from "./MarkdownEditor.js";

const meta = {
  title: "Components/MarkdownEditor",
  component: MarkdownEditor,
  tags: ["autodocs"],
  args: {
    value: "# Hello\n\nSome **markdown**, kept exactly as written.\n",
    onChange: () => {},
  },
} satisfies Meta<typeof MarkdownEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { value: "" } };

/** A page much taller than the screen: the page scrolls, not the editor. */
export const LongPage: Story = {
  args: {
    value: Array.from(
      { length: 80 },
      (_, i) => `Line ${i + 1}: the quick brown fox jumps over the lazy dog.`,
    ).join("\n"),
  },
};

export const KeepsOddText: Story = {
  args: {
    value: "  indented\t\ttabs   \n\n\n- é ✓ \u{1F600}\n<b>raw html</b>\n",
  },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByLabelText("Markdown");
    await expect(editorText(box)).toBe(
      "  indented\t\ttabs   \n\n\n- é ✓ \u{1F600}\n<b>raw html</b>\n",
    );
  },
};

/** Typing changes the text; this one keeps its own state to show it. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <>
        <MarkdownEditor {...args} value={value} onChange={setValue} />
        <p data-testid="echo">{value.length} characters</p>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    appendText(await canvas.findByLabelText("Markdown"), " More.");
    await expect(await canvas.findByText(/^\d+ characters$/)).toBeVisible();
    await expect(editorText(canvas.getByLabelText("Markdown"))).toContain(
      " More.",
    );
  },
};
