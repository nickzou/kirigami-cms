import {
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ApiRequestError } from "../../api.js";
import { pathProblem } from "../../page-path.js";
import { HeaderTitleSlot } from "../AppShell/header-slot.js";

export interface PagePathFieldProps {
  /** The page's current path. */
  path: string;
  /** Sits to the left of the field, like a way back. */
  before?: ReactNode;
  /** The paths of the other pages (not this one), to say right away if one is taken. */
  others?: readonly string[];
  /** Why the path cannot be changed right now, or nothing if it can. */
  lockedReason?: string;
  /** The field was focused: a good time to fetch `others`. */
  onStartEditing?: () => void;
  /** Moves the page to this path. A refusal from the API is shown under the field. */
  onRename: (to: string) => Promise<void>;
}

const EXTENSION = ".md";
/** The path without its extension, which is not the person's to change. */
const stemOf = (path: string): string =>
  path.endsWith(EXTENSION) ? path.slice(0, -EXTENSION.length) : path;

/**
 * The page's path as the screen's title: a text field that looks like a
 * heading until you point at it. Only pages are markdown, so `.md` is shown
 * after the field and is not part of what is edited. Enter (or leaving the field) renames the page,
 * Escape puts the old path back. What is wrong with a path is said under the
 * field as it is typed. Like `HeaderTitle`, it sits in the header, and is an
 * ordinary heading in place where there is no header.
 */
export function PagePathField({
  path,
  before,
  others,
  lockedReason,
  onStartEditing,
  onRename,
}: PagePathFieldProps) {
  const slot = useContext(HeaderTitleSlot);
  const inputId = useId();
  const messageId = useId();
  const [input, setInput] = useState(stemOf(path));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  // Another path (the page moved, or the page changed under us): show it.
  useEffect(() => setInput(stemOf(path)), [path]);

  const stem = input.trim().replace(/^\/+/, "");
  const next = stem === "" ? "" : `${stem}${EXTENSION}`;
  const unchanged = next === path;
  const problem = unchanged ? undefined : pathProblem(next, others ?? []);
  // Nothing to complain about while the field is empty: leaving it puts the path back.
  const message = failure ?? (input.trim() === "" ? undefined : problem);

  const revert = () => {
    setInput(stemOf(path));
    setFailure(undefined);
  };

  async function commit() {
    if (busy) return;
    if (input.trim() === "" || unchanged) return revert();
    if (problem) return; // stays as typed, with the reason showing
    setBusy(true);
    setFailure(undefined);
    try {
      await onRename(next);
      setBusy(false);
    } catch (error) {
      setFailure(
        error instanceof ApiRequestError
          ? error.message
          : "Could not reach the server. Try again.",
      );
      setBusy(false);
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    } else if (event.key === "Escape") {
      revert();
      event.currentTarget.blur();
    }
  };

  const field = (
    <h1 className=":uno: m-0 min-w-0 max-w-lg flex-1 text-lg">
      <label htmlFor={inputId} className=":uno: sr-only">
        Page path
      </label>
      <div className=":uno: flex w-fit max-w-full items-center rounded border border-solid border-transparent px-2 py-1 transition-[border-color,background-color] duration-200 ease-[ease-in-out] focus-within:border-accent focus-within:bg-bg hover:border-line motion-reduce:transition-none">
        <input
          id={inputId}
          value={input}
          readOnly={lockedReason !== undefined}
          disabled={busy}
          title={lockedReason}
          spellCheck={false}
          aria-invalid={message !== undefined}
          aria-describedby={message ? messageId : undefined}
          onFocus={onStartEditing}
          onChange={(event) => {
            // Typing the extension is no use: it is already there.
            setInput(event.target.value.replace(/\.md$/i, ""));
            setFailure(undefined);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => void commit()}
          className=":uno: min-w-[4ch] max-w-full flex-1 truncate border-0 bg-transparent p-0 text-text [field-sizing:content] [font:inherit] focus:outline-none"
        />
        <label
          htmlFor={inputId}
          aria-hidden="true"
          className=":uno: shrink-0 cursor-text select-none text-muted"
        >
          {EXTENSION}
        </label>
      </div>
    </h1>
  );
  const alert = message && (
    <p
      id={messageId}
      role="alert"
      className=":uno: absolute top-full left-0 z-10 m-0 mt-1 max-w-md rounded border border-solid border-line bg-surface px-3 py-2 text-sm text-danger shadow-lg"
    >
      {message}
    </p>
  );

  return slot ? (
    <>
      {createPortal(
        <>
          {before}
          {field}
        </>,
        slot,
      )}
      {alert && createPortal(alert, slot)}
    </>
  ) : (
    <>
      {before}
      {field}
      {alert}
    </>
  );
}
