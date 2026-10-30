import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { siteSections } from "../../settings-schema.js";
import { SettingField } from "./SettingField.js";

const fieldOf = (key: string) => {
  const found = siteSections
    .flatMap((s) => s.fields)
    .find((f) => f.key === key);
  if (!found) throw new Error(`no field ${key}`);
  return found;
};

const meta = {
  title: "Components/SettingField",
  component: SettingField,
  tags: ["autodocs"],
  args: {
    field: fieldOf("theme/colors/link"),
    text: "",
    isSet: false,
    onChange: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof SettingField>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Empty means the default applies, and the default shows as the placeholder. */
export const Color: Story = {};
export const ColorSet: Story = { args: { text: "#9c27b0", isSet: true } };
export const Length: Story = {
  args: { field: fieldOf("theme/layout/maxWidth") },
};
export const Font: Story = { args: { field: fieldOf("theme/fonts/body") } };
export const Scale: Story = {
  args: { field: fieldOf("theme/type/scale"), text: "1.5", isSet: true },
};
export const WithError: Story = {
  args: {
    text: "not a color!",
    isSet: true,
    error: "Enter a color such as #1a1a1a, rgb(26 26 26), or a color name.",
  },
};

/** Typing changes the text; Reset clears it. This one keeps its own state to show it. */
export const Interactive: Story = {
  render: (args) => {
    const [text, setText] = useState(args.text);
    return (
      <SettingField
        {...args}
        text={text}
        isSet={text !== ""}
        onChange={setText}
        onReset={() => setText("")}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Links");
    await expect(canvas.queryByRole("button", { name: /Reset/ })).toBeNull();
    await userEvent.type(input, "#112233");
    await expect(input).toHaveValue("#112233");
    await userEvent.click(canvas.getByRole("button", { name: "Reset Links" }));
    await expect(input).toHaveValue("");
  },
};
