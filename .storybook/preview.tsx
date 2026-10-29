import type { Preview } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";
import "virtual:uno.css";
import "@fontsource/amiko/400.css";
import "@fontsource/amiko/700.css";
import "../admin/src/styles.css";
import "./docs.css";
import { ThemedDocsContainer } from "./DocsContainer.js";

const preview: Preview = {
  // A fixed start, so everyone opens Storybook looking at the same thing.
  // "System" is still in the toolbar for anyone who wants it.
  initialGlobals: { theme: "light" },
  globalTypes: {
    theme: {
      description: "Light or dark colors for the admin",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        dynamicTitle: true,
        items: [
          { value: "system", title: "System", icon: "browser" },
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
      },
    },
  },
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    a11y: { test: "error" },
    docs: { container: ThemedDocsContainer },
  },
  decorators: [
    // "system" leaves the choice to the browser's own setting.
    (Story, { globals }) => {
      const root = document.documentElement;
      if (globals.theme === "light" || globals.theme === "dark") {
        root.dataset.theme = globals.theme;
      } else {
        delete root.dataset.theme;
      }
      return <Story />;
    },
    // The admin's links and editor guard need a (data) router around them.
    (Story, { parameters }) => {
      const router = createMemoryRouter([{ path: "*", element: <Story /> }], {
        initialEntries: [parameters.route ?? "/"],
      });
      return <RouterProvider router={router} />;
    },
  ],
};

export default preview;
