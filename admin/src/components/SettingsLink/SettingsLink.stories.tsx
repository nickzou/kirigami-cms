import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsLink } from "./SettingsLink.js";

const meta = {
  title: "Components/SettingsLink",
  component: SettingsLink,
  tags: ["autodocs"],
  // Shown on a phone only, so the stories open at that width.
  parameters: { viewport: { defaultViewport: "phone" } },
} satisfies Meta<typeof SettingsLink>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
