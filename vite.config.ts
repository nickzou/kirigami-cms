import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

// The admin app lives in admin/ and is built into dist/admin, where the dev
// server finds it. Under `vite` (for working on the admin itself) the API is
// proxied to a running `kirigami dev`.
const devServer = process.env.KIRIGAMI_DEV_URL ?? "http://localhost:3000";

export default defineConfig({
  root: "admin",
  base: "/admin/",
  plugins: [UnoCSS(), react()],
  build: { outDir: "../dist/admin", emptyOutDir: true },
  server: {
    // Everything outside /admin goes to `kirigami dev`: the API, the build
    // events, and the site's own pages, which the editor shows in its preview.
    proxy: { "^/(?!admin(/|$)).*": devServer },
  },
});
