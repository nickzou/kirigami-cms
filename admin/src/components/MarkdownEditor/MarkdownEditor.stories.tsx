import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, within } from "storybook/test";
import { buildTheme, siteSections } from "../../settings-schema.js";
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

const everything = `# A heading

Some **bold**, *italic*, ~~struck~~ and \`inline code\` text, with a [link to the docs](https://example.com/docs) and a bare <https://example.com> link.

## A smaller heading

> A quote that carries on
> across two lines.

- one
- two
  - nested
- [ ] a task
- [x] a done task

1. first
2. second

\`\`\`js
const answer = 42;
\`\`\`

---

### Third level
#### Fourth level
##### Fifth level
###### Sixth level

Setext heading
==============

Raw html and a table stay as written for now:

| a | b |
|---|---|
| 1 | 2 |
`;

const themed = (values: Record<string, string | number>) =>
  buildTheme(siteSections, new Map(Object.entries(values)));
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

/** Every element the editor draws, with the cursor at the very end (so no marks are showing). */
export const Formatting: Story = { args: { value: everything } };

/** A site with a serif body, a dark page, a narrow column and a bigger scale. */
export const ASitesOwnTheme: Story = {
  args: {
    value: everything,
    theme: themed({
      "theme/colors/background": "#14161a",
      "theme/colors/text": "#e8e6e3",
      "theme/colors/muted": "#9a9690",
      "theme/colors/link": "#f0b429",
      "theme/colors/border": "#3a3d44",
      "theme/colors/codeBackground": "#22252b",
      "theme/fonts/body": "Georgia, 'Times New Roman', serif",
      "theme/fonts/heading": "Georgia, 'Times New Roman', serif",
      "theme/type/baseSize": "1.125rem",
      "theme/type/scale": 1.25,
      "theme/layout/maxWidth": "36rem",
    }),
  },
};

/** Marks are hidden until the cursor reaches them: put it in the bold text. */
export const ReachingAMark: Story = {
  args: {
    value:
      "# Title\n\nSome **bold** words and a [link](https://example.com).\n",
  },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByLabelText("Markdown");
    const view = (await import("../../test-editor.js")).editorView(box);
    // Away from the marks: the ** are not in the text on screen.
    await expect(box.textContent).not.toContain("**");
    await expect(box.textContent).not.toContain("](https");
    // The cursor only shows marks while the editor is being used.
    view.focus();
    const at = view.state.doc.toString().indexOf("bold") + 2;
    view.dispatch({ selection: { anchor: at } });
    await expect(box.textContent).toContain("**bold**");
    // The link's marks are still hidden, since the cursor is not in it.
    await expect(box.textContent).not.toContain("](https");
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    await expect(box.textContent).not.toContain("**");
  },
};
