import type { Meta, StoryObj } from "@storybook/react-vite";
import { defaultSiteConfig } from "../../../../src/core/config/load.js";
import { previewDocument } from "../../preview-document.js";
import { ThemePreview } from "./ThemePreview.js";

const meta = {
  title: "Components/ThemePreview",
  component: ThemePreview,
  tags: ["autodocs"],
} satisfies Meta<typeof ThemePreview>;
export default meta;
type Story = StoryObj<typeof meta>;

const theme = defaultSiteConfig.theme;

/** The sample page, in the default theme. */
export const Default: Story = {
  args: { html: previewDocument(undefined, theme) },
};

export const Themed: Story = {
  args: {
    html: previewDocument(undefined, {
      ...theme,
      colors: {
        ...theme.colors,
        background: "#14110f",
        text: "#f1e9de",
        muted: "#b9a994",
        link: "#f2a65a",
        border: "#3b332c",
        codeBackground: "#241e19",
      },
      fonts: {
        ...theme.fonts,
        body: "Georgia, serif",
        heading: "Georgia, serif",
      },
      type: { ...theme.type, scale: 1.333 },
      layout: { maxWidth: "36rem" },
    }),
  },
};
