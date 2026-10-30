import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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
/** A value that is not valid turns Save off, but the note still says there are changes. */
export const Blocked: Story = { args: { dirty: true, blocked: true } };

/** The label changes to "Saving…" only if the save takes a while. */
export const Saving: Story = {
  args: { dirty: true, saving: true },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
  },
};
