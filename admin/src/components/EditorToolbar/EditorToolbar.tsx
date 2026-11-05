import {
  Bold,
  Code,
  Heading,
  Italic,
  Link,
  List,
  type LucideIcon,
} from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import type { FormatAction } from "../../markdown-edit.js";

interface Item {
  action: FormatAction;
  label: string;
  icon: LucideIcon;
  /** The shortcut, with `Mod` standing for Cmd or Ctrl. */
  shortcut?: string;
  /** A hint on what a click does, for the tooltip. */
  hint?: string;
}

const items: readonly Item[] = [
  { action: "bold", label: "Bold", icon: Bold, shortcut: "Mod+B" },
  { action: "italic", label: "Italic", icon: Italic, shortcut: "Mod+I" },
  {
    action: "heading",
    label: "Heading",
    icon: Heading,
    hint: "click again for a smaller one",
  },
  { action: "link", label: "Link", icon: Link, shortcut: "Mod+K" },
  { action: "bullets", label: "Bulleted list", icon: List },
  { action: "code", label: "Code", icon: Code },
];

const isMac = (): boolean =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/** "Mod+B" as "⌘B" on a Mac and "Ctrl+B" elsewhere. */
const shortcutText = (shortcut: string): string =>
  isMac() ? shortcut.replace("Mod+", "⌘") : shortcut.replace("Mod", "Ctrl");

/** The shortcut as `aria-keyshortcuts` says it: both the Ctrl and the Cmd form. */
const keyShortcuts = (shortcut: string | undefined): string | undefined =>
  shortcut &&
  `${shortcut.replace("Mod", "Control")} ${shortcut.replace("Mod", "Meta")}`;

const tooltip = ({ label, shortcut, hint }: Item): string =>
  [label, shortcut && `(${shortcutText(shortcut)})`, hint && `, ${hint}`]
    .filter(Boolean)
    .join(" ")
    .replace(" ,", ",");

export interface EditorToolbarProps {
  onAction: (action: FormatAction) => void;
  /** The formatting the text is in now; those buttons show as pressed. */
  active?: ReadonlySet<FormatAction>;
  /** Escape was pressed in the toolbar: go back to the text. */
  onEscape?: () => void;
}

/**
 * The formatting buttons: a slim bar of icons. They only add or take off the
 * usual markdown marks. A click does not take the focus out of the text (the
 * selection is what they work on). It is one stop for the Tab key, and the
 * arrow keys, Home and End move between the buttons.
 */
export function EditorToolbar({
  onAction,
  active,
  onEscape,
}: EditorToolbarProps) {
  const [current, setCurrent] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const index = (to + items.length) % items.length;
    setCurrent(index);
    buttons.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }
    const keys: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: items.length - 1,
    };
    const to = keys[event.key];
    if (to === undefined) return;
    event.preventDefault();
    move(to);
  };

  return (
    // The arrow keys are handled here, once, for all the buttons.
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className=":uno: inline-flex gap-1 rounded-full border border-solid border-line bg-surface p-1 shadow"
    >
      {items.map((item, index) => (
        <button
          key={item.action}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          type="button"
          aria-label={item.label}
          aria-pressed={active?.has(item.action) ?? false}
          aria-keyshortcuts={keyShortcuts(item.shortcut)}
          title={tooltip(item)}
          tabIndex={index === current ? 0 : -1}
          // Pressing a button must not take the focus (or the selection) out of the text.
          onMouseDown={(event) => event.preventDefault()}
          onFocus={() => setCurrent(index)}
          onClick={() => onAction(item.action)}
          className={
            active?.has(item.action)
              ? ":uno: inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-accent p-0 text-on-accent transition-colors duration-200 ease-[ease-in-out] hover:bg-accent-hover focus-visible:[outline:2px_solid_var(--accent)] focus-visible:outline-offset-2 motion-reduce:transition-none"
              : ":uno: inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-text transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle focus-visible:[outline:2px_solid_var(--accent)] focus-visible:outline-offset-2 motion-reduce:transition-none"
          }
        >
          <item.icon size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
