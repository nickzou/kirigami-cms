import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    // Storybook gets its own small Vite config: the app's sets a root and base
    // that only make sense for the real admin build.
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  stories: ["../admin/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  // No usage data leaves contributors' machines.
  core: { disableTelemetry: true },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    // The admin has its own tsconfig; the root one does not include admin/, so
    // without this the props tables on the Docs pages are skipped.
    reactDocgenTypescriptOptions: {
      tsconfigPath: "admin/tsconfig.json",
      // Only the admin components need prop tables, not Storybook's own config.
      exclude: [".storybook/**"],
    },
  },
};

export default config;
