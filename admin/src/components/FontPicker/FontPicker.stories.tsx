import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { siteSections } from "../../settings-schema.js";
import { FontPicker } from "./FontPicker.js";

const fieldOf = (key: string) => {
  const found = siteSections
    .flatMap((s) => s.fields)
    .find((f) => f.key === key);
  if (!found) throw new Error(`no field ${key}`);
  return found;
};

const meta = {
  title: "Components/FontPicker",
  component: FontPicker,
  tags: ["autodocs"],
  args: {
    field: fieldOf("theme/fonts/body"),
    id: "font",
    text: "",
    describedBy: "",
    invalid: false,
    onChange: fn(),
  },
  // The setting's own label sits above, as in the Settings screen.
  decorators: [
    (Story: () => React.JSX.Element) => (
      <div>
        <label htmlFor="font" className=":uno: font-bold">
          Body font
        </label>
        <div className=":uno: flex">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof FontPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};
export const Heading: Story = {
  args: { field: fieldOf("theme/fonts/heading") },
};
export const Mono: Story = { args: { field: fieldOf("theme/fonts/mono") } };

export const APreset: Story = {
  args: { text: 'Georgia, "Times New Roman", serif' },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByLabelText("Body font"),
    ).toHaveDisplayValue("Georgia");
  },
};

/** A list that is not one of the choices shows as Custom, with the text to edit. */
export const ACustomList: Story = {
  args: { text: "Lora, serif" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Body font")).toHaveDisplayValue(
      "Custom…",
    );
    await expect(
      canvas.getByLabelText("Body font, custom font list"),
    ).toHaveValue("Lora, serif");
  },
};

/** The default's choice leaves the field empty; another choice writes its list. */
export const Picks: Story = {
  render: (args) => {
    const [text, setText] = useState(args.text);
    return <FontPicker {...args} text={text} onChange={setText} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = await canvas.findByLabelText("Body font");
    await userEvent.selectOptions(select, "Georgia");
    await expect(select).toHaveDisplayValue("Georgia");
    await userEvent.selectOptions(select, "System sans-serif");
    await expect(select).toHaveDisplayValue("System sans-serif");
    await expect(canvas.queryByRole("textbox")).toBeNull();
  },
};

/** "Custom…" starts from the list in use, to adjust. */
export const ChoosesCustom: Story = {
  render: (args) => {
    const [text, setText] = useState(args.text);
    return <FontPicker {...args} text={text} onChange={setText} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(
      await canvas.findByLabelText("Body font"),
      "Custom…",
    );
    const box = canvas.getByLabelText("Body font, custom font list");
    await expect((box as HTMLInputElement).value).toContain("system-ui");
  },
};
