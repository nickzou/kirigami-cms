import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { AppHeader } from "./AppHeader.js";

const meta = {
  title: "Components/AppHeader",
  component: AppHeader,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHeader>;
export default meta;

export const Default: StoryObj<typeof meta> = {};

/** A screen can put its main action on the right. */
export const WithAction: StoryObj<typeof meta> = {
  args: { children: <Button variant="primary">Save</Button> },
};

/** From a tablet up, the page fades into the header's lower edge as it scrolls under it. */
export const WithFade: StoryObj<typeof meta> = {
  args: { fade: true, children: <Button variant="primary">Save</Button> },
};
