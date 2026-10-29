import { defineConfig, presetWind3, transformerCompileClass } from "unocss";

// Colors, radii and shadows are CSS variables (defined for light and dark in
// admin/src/styles.css), so one set of utilities serves both themes.
export default defineConfig({
  presets: [presetWind3()],
  // `:uno: p-4 flex` in a class string compiles to one hashed class, `uno-1a2b3c`.
  transformers: [transformerCompileClass()],
  theme: {
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      subtle: "var(--subtle)",
      text: "var(--text)",
      muted: "var(--muted)",
      line: "var(--border)",
      accent: "var(--accent)",
      "accent-hover": "var(--accent-hover)",
      "accent-soft": "var(--accent-soft)",
      "on-accent": "var(--on-accent)",
      danger: "var(--danger)",
      "danger-soft": "var(--danger-soft)",
      warning: "var(--warning)",
      "warning-soft": "var(--warning-soft)",
    },
    borderRadius: { DEFAULT: "0.5rem", lg: "0.75rem" },
    boxShadow: {
      DEFAULT: "var(--shadow)",
      lg: "var(--shadow-lg)",
    },
  },
});
