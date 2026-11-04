import type { FormatAction } from "./markdown-edit.js";

/** What the screen can ask of the text editor, besides what it is told to show. */
export interface EditorHandle {
  /** Puts the cursor in the text, where it was. */
  focus(): void;
  /** Puts the cursor at the end of the text. */
  focusEnd(): void;
  /** Selects all the text, to copy it by hand. */
  selectAll(): void;
  /** Does a formatting action (bold, a link, …) to the selection, and keeps the focus in the text. */
  format(action: FormatAction): void;
}
