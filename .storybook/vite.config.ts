import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [UnoCSS(), react()],
  resolve: {
    // The stories run the real server code in the browser (see
    // `admin/src/fake-api.ts`), and its sign-in code uses `node:crypto`,
    // which a browser does not have.
    alias: {
      "node:crypto": fileURLToPath(
        new URL("../admin/src/storybook-crypto.ts", import.meta.url),
      ),
    },
  },
});
