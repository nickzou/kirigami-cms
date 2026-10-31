import type { SettingField } from "../../settings-schema.js";

export interface FontPreset {
  label: string;
  /** The font-family list written to `site.yaml`. */
  value: string;
}

const SANS: FontPreset = {
  label: "System sans-serif",
  value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};
const TEXT: readonly FontPreset[] = [
  SANS,
  {
    label: "System serif",
    value: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  },
  { label: "Georgia", value: 'Georgia, "Times New Roman", serif' },
  {
    label: "Humanist sans-serif",
    value: 'Optima, Candara, "Noto Sans", "Segoe UI", sans-serif',
  },
  {
    label: "Geometric sans-serif",
    value: 'Avenir, Montserrat, Corbel, "URW Gothic", sans-serif',
  },
  {
    label: "Transitional serif",
    value: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
  },
  {
    label: "Old-style serif",
    value: '"Iowan Old Style", "Palatino Linotype", Palatino, serif',
  },
  {
    label: "Rounded sans-serif",
    value:
      'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Nunito, sans-serif',
  },
];
const MONO: readonly FontPreset[] = [
  {
    label: "System monospace",
    value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  {
    label: "Classic monospace",
    value: '"Courier New", Courier, monospace',
  },
  {
    label: "Developer monospace",
    value:
      '"Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
  },
];

/** The ready-made lists to offer for a font setting. The first is the setting's default. */
export function presetsFor(field: SettingField): readonly FontPreset[] {
  const fallback = String(field.default);
  if (fallback === "inherit") {
    return [{ label: "Same as the body font", value: "inherit" }, ...TEXT];
  }
  const list = /monospace/.test(fallback) ? MONO : TEXT;
  // The default's own entry carries the default's exact text, so it matches an empty field.
  const first = list.find((preset) => preset.value === fallback);
  return first ? [first, ...list.filter((p) => p !== first)] : list;
}
