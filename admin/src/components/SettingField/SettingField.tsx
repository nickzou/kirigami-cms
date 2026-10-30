import { useId } from "react";
import type { SettingField as Setting } from "../../settings-schema.js";
import { Button } from "../Button/Button.js";

export interface SettingFieldProps {
  field: Setting;
  /** What is typed in the field. Empty means the default applies. */
  text: string;
  /** Why the text cannot be used, if it cannot. */
  error?: string;
  /** Whether there is a value to reset. */
  isSet: boolean;
  onChange: (text: string) => void;
  onReset: () => void;
}

const inputClass =
  ":uno: block w-full min-w-0 rounded border border-solid border-line bg-bg p-2 text-text";
const monoInputClass =
  ":uno: block w-full min-w-0 rounded border border-solid border-line bg-bg p-2 font-mono text-text";

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * One setting: its title and what it is for, an input that suits it (a color
 * picker beside the text for colors), the default it falls back to, and a
 * Reset button once it is set. An empty input means the default applies.
 */
export function SettingField({
  field,
  text,
  error,
  isSet,
  onChange,
  onReset,
}: SettingFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const defaultId = `${id}-default`;
  const errorId = `${id}-error`;
  const describedBy = [descriptionId, defaultId, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  const common = {
    id,
    value: text,
    placeholder: String(field.default),
    "aria-describedby": describedBy,
    "aria-invalid": error !== undefined,
    onChange: (event: { target: { value: string } }) =>
      onChange(event.target.value),
  };

  // The swatch shows the color in use: what is typed if it is a color, else the default.
  const shown =
    error === undefined && text.trim() !== "" ? text : field.default;
  const pickerValue = HEX.test(text)
    ? text
    : HEX.test(String(field.default))
      ? String(field.default)
      : "#000000";

  return (
    <div>
      <label htmlFor={id} className=":uno: font-bold">
        {field.title}
      </label>
      <p id={descriptionId} className=":uno: m-0 mb-2 text-sm text-muted">
        {field.description}
      </p>
      <div className=":uno: flex items-center gap-2">
        {field.widget === "color" && (
          <label className=":uno: relative block h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded border border-solid border-line">
            <span
              aria-hidden="true"
              className=":uno: absolute inset-0"
              style={{ background: String(shown) }}
            />
            <input
              type="color"
              aria-label={`Pick a color for ${field.title}`}
              value={pickerValue}
              onChange={(event) => onChange(event.target.value)}
              className=":uno: absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        )}
        {field.widget === "number" ? (
          <input
            {...common}
            type="number"
            inputMode="decimal"
            step="0.05"
            min={field.min}
            max={field.max}
            className={monoInputClass}
          />
        ) : (
          <input
            {...common}
            type="text"
            spellCheck={false}
            autoComplete="off"
            className={field.widget === "font" ? inputClass : monoInputClass}
          />
        )}
        {isSet && (
          <Button
            size="small"
            onClick={onReset}
            aria-label={`Reset ${field.title}`}
          >
            Reset
          </Button>
        )}
      </div>
      <p id={defaultId} className=":uno: m-0 mt-1 text-sm text-muted">
        Default:{" "}
        <span className=":uno: font-mono">{String(field.default)}</span>
      </p>
      {error && (
        <p
          id={errorId}
          role="alert"
          className=":uno: m-0 mt-1 text-sm text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
