import { type KeyboardEvent, useEffect, useRef } from "react";
import { Button } from "../Button/Button.js";
import { TextField } from "../TextField/TextField.js";

export interface LinkPopoverProps {
  /** Where the popover sits, in the page it is placed in (its top left corner). */
  left: number;
  top: number;
  /** The link's address, as written. */
  url: string;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
  /** Escape, Enter or the Save button: done here, back to the text. */
  onDone: () => void;
  /** Where "Open" goes: only an address that is safe to open (not `javascript:`). */
  openHref?: string;
  /** Faded out of the way while the text is being typed. */
  faded?: boolean;
  /** Raise this to move the focus into the address field, with its text selected. */
  focusTick?: number;
}

/**
 * Edits the link the cursor is in: its address, and a way to open or remove it.
 * The markdown's brackets and address are never shown in the text, so this is
 * where the address lives. It floats under the link.
 */
export function LinkPopover({
  left,
  top,
  url,
  onUrlChange,
  onRemove,
  onDone,
  openHref,
  faded = false,
  focusTick = 0,
}: LinkPopoverProps) {
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusTick === 0) return;
    const input = field.current?.querySelector("input");
    input?.focus();
    input?.select();
  }, [focusTick]);

  const keys = (event: KeyboardEvent) => {
    if (event.key !== "Escape" && event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    onDone();
  };

  return (
    <fieldset
      aria-label="Link"
      onKeyDown={keys}
      style={{ left, top }}
      className={
        faded
          ? ":uno: pointer-events-none absolute z-20 m-0 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-solid border-line bg-surface p-3 text-text [&_*]:[font-family:Amiko,system-ui,sans-serif] opacity-0 shadow-lg transition-opacity duration-200 ease-[ease-in-out] motion-reduce:transition-none"
          : ":uno: absolute z-20 m-0 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-solid border-line bg-surface p-3 text-text [&_*]:[font-family:Amiko,system-ui,sans-serif] opacity-100 shadow-lg transition-opacity duration-200 ease-[ease-in-out] motion-reduce:transition-none"
      }
    >
      <div ref={field}>
        <TextField
          label="Address"
          mono
          value={url}
          placeholder="https://"
          autoComplete="off"
          spellCheck={false}
          tabIndex={faded ? -1 : undefined}
          onChange={(event) => onUrlChange(event.target.value)}
        />
      </div>
      <div className=":uno: mt-3 flex gap-2">
        {openHref === undefined ? (
          <Button size="small" disabled>
            Open
          </Button>
        ) : (
          <Button
            size="small"
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open
          </Button>
        )}
        <Button size="small" onClick={onRemove}>
          Remove link
        </Button>
        <Button
          size="small"
          variant="primary"
          className=":uno: ml-auto"
          onClick={onDone}
        >
          Save
        </Button>
      </div>
    </fieldset>
  );
}
