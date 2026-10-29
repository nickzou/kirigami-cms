import type { Preview } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";
import "virtual:uno.css";
import "@fontsource/amiko/400.css";
import "@fontsource/amiko/700.css";
import "../admin/src/styles.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    a11y: { test: "error" },
  },
  decorators: [
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
