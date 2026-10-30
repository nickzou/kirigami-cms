import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { siteSections } from "../../settings-schema.js";
import { SettingField } from "../SettingField/SettingField.js";
import { SettingsSection } from "./SettingsSection.js";

const meta = {
  title: "Components/SettingsSection",
  component: SettingsSection,
  tags: ["autodocs"],
} satisfies Meta<typeof SettingsSection>;
export default meta;
type Story = StoryObj<typeof meta>;

const colors = siteSections[0];
if (!colors) throw new Error("no sections");

export const Default: Story = {
  args: {
    title: colors.title,
    description: colors.description,
    children: colors.fields
      .slice(0, 3)
      .map((field) => (
        <SettingField
          key={field.key}
          field={field}
          text=""
          isSet={false}
          onChange={fn()}
          onReset={fn()}
        />
      )),
  },
};
