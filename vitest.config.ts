import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [UnoCSS(), react()],
  test: {
    include: [
      "src/**/*.test.ts",
      "test/**/*.test.ts",
      "admin/**/*.test.{ts,tsx}",
    ],
  },
});
