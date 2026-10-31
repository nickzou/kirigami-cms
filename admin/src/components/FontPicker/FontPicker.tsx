import { useState } from "react";
import type { SettingField } from "../../settings-schema.js";
import { Select } from "../Select/Select.js";
import { presetsFor } from "./font-presets.js";

export interface FontPickerProps {
  field: SettingField;
  /** The `id` the setting's label points at. */
  id: string;
  /** What is in the field. Empty means the default applies. */
  text: string;
  describedBy: string;
  invalid: boolean;
  onChange: (text: string) => void;
}

const CUSTOM = "custom";

// Whole class string, so UnoCSS can find it.
const customInput =
  ":uno: mt-2 block w-full min-w-0 rounded border border-solid border-line bg-bg p-2 font-mono text-text";

/**
 * Chooses a font for people who do not write CSS: a list of ready-made
 * choices, each shown in its own face, and "Custom…" for a font-family list of
 * your own (the text field underneath). What is written to `site.yaml` is
 * always the font-family list, so either way it is the same setting. The
 * default's choice leaves the field empty, so it is still "not set".
 */
export function FontPicker({
  field,
  id,
  text,
  describedBy,
  invalid,
  onChange,
}: FontPickerProps) {
  const presets = presetsFor(field);
  const fallback = String(field.default);
  const current = text.trim() === "" ? fallback : text.trim();
  const match = presets.find((preset) => preset.value === current);
  // "Custom…" was picked (the list may not be a preset yet), or it is not one.
  const [pickedCustom, setPickedCustom] = useState(false);
  const custom = pickedCustom || match === undefined;

  return (
    <div className=":uno: min-w-0 flex-1">
      <Select
        id={id}
        value={custom ? CUSTOM : match.value}
        aria-describedby={describedBy}
        onChange={(event) => {
          const value = event.target.value;
          if (value === CUSTOM) {
            setPickedCustom(true);
            // Start from what is in use, so it can be adjusted.
            if (text.trim() === "") onChange(current);
            return;
          }
          setPickedCustom(false);
          onChange(value === fallback ? "" : value);
        }}
      >
        {presets.map((preset) => (
          <option
            key={preset.value}
            value={preset.value}
            style={
              preset.value === "inherit"
                ? undefined
                : { fontFamily: preset.value }
            }
          >
            {preset.label}
          </option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </Select>
      {custom && (
        <input
          type="text"
          aria-label={`${field.title}, custom font list`}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          value={text}
          placeholder={fallback}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className={customInput}
        />
      )}
      {!invalid && (
        <p
          aria-hidden="true"
          style={current === "inherit" ? undefined : { fontFamily: current }}
          className=":uno: m-0 mt-2 text-text"
        >
          The quick brown fox jumps over the lazy dog.
        </p>
      )}
    </div>
  );
}
