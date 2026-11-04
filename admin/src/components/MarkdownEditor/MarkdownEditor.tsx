import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { Annotation, EditorState, Prec, Transaction } from "@codemirror/state";
import {
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import { HEADING_LEVELS } from "../../../../src/core/config/css.js";
import type { Theme } from "../../../../src/core/config/schema.js";
import type { EditorHandle } from "../../editor-handle.js";
import { defaultTheme, editorVariables } from "../../editor-theme.js";
import {
  safeLinkTarget,
  stepIntoTables,
  tableWidgets,
} from "../../editor-widgets.js";
import { applyFormat, continueMarkup } from "../../markdown-edit.js";
import {
  formatPieces,
  linkAt,
  markdownSupport,
  toDecorations,
} from "../../markdown-format.js";

export interface MarkdownEditorProps {
  /** The text. It is the editor's own state: set it to replace what is there. */
  value: string;
  onChange: (value: string) => void;
  /** Names the text box for screen readers. */
  label?: string;
  /** The site's theme: the editor's page looks like the site. The default theme when not given. */
  theme?: Theme;
  ref?: Ref<EditorHandle>;
}

/**
 * Draws the markdown's formatting (see `formatPieces`) for what is on screen,
 * and again when the text, the cursor, the focus or the parse changes. Marks
 * show at the cursor only while the editor has the focus, so a page just
 * opened looks like the site.
 */
const formatting = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.focusChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      return toDecorations(
        view.visibleRanges.flatMap(({ from, to }) =>
          formatPieces(view.state, from, to, view.hasFocus),
        ),
      );
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

/** Marks a change that came from `value`, so it is not reported back or made undoable. */
const fromOutside = Annotation.define<boolean>();

// The look of the page: the site's own fonts, sizes, colors and spacing, taken
// from the `--k-*` and `--kcm-*` variables on the page this sits in (see
// `editorVariables`). Formatting classes (`kcm-*`) come from `markdown-format`.
const look = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "var(--k-color-text)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--k-font-body)",
    fontSize: "var(--k-font-size)",
    lineHeight: "var(--k-line-height)",
    overflow: "visible",
  },
  ".cm-content": {
    // No minimum height here: the editor re-measures its lines when its
    // content changes height, which a minimum would hide for a short page (an
    // image that loads later would then leave the cursor keys confused). The
    // page around it keeps the room, and a click there focuses the text.
    padding: "0",
    caretColor: "var(--k-color-text)",
  },
  ".cm-line": { padding: "0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--k-color-text)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
    {
      backgroundColor:
        "color-mix(in srgb, var(--k-color-link) 30%, transparent)",
    },
  ...Object.fromEntries(
    HEADING_LEVELS.map((level) => [
      `.kcm-${level}`,
      {
        fontFamily: "var(--k-font-heading)",
        fontSize: `var(--kcm-${level}-size)`,
        fontWeight: `var(--kcm-${level}-weight)`,
        lineHeight: "1.2",
        ...(level === "h6" ? { color: "var(--k-color-muted)" } : {}),
      },
    ]),
  ),
  ".kcm-setext-underline": { color: "var(--k-color-muted)" },
  ".kcm-strong": { fontWeight: "bold" },
  ".kcm-em": { fontStyle: "italic" },
  ".kcm-del": {
    textDecoration: "line-through",
    color: "var(--k-color-muted)",
  },
  ".kcm-code": {
    fontFamily: "var(--k-font-mono)",
    fontSize: "0.9em",
    backgroundColor: "var(--k-color-code-background)",
    borderRadius: "4px",
  },
  ".kcm-link": {
    color: "var(--k-color-link)",
    textDecoration: "underline",
    textUnderlineOffset: "0.15em",
  },
  ".kcm-url": { color: "var(--k-color-muted)" },
  ".kcm-quote": {
    paddingLeft: "var(--k-space)",
    borderLeft: "4px solid var(--k-color-border)",
    color: "var(--k-color-muted)",
  },
  ".kcm-list-mark": { color: "var(--k-color-muted)" },
  ".kcm-task-marker": { fontFamily: "var(--k-font-mono)" },
  ".kcm-code-block": {
    fontFamily: "var(--k-font-mono)",
    fontSize: "0.875em",
    backgroundColor: "var(--k-color-code-background)",
    paddingLeft: "var(--k-space)",
    paddingRight: "var(--k-space)",
  },
  ".kcm-code-first": {
    paddingTop: "calc(var(--k-space) * 0.5)",
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
  },
  ".kcm-code-last": {
    paddingBottom: "calc(var(--k-space) * 0.5)",
    borderBottomLeftRadius: "6px",
    borderBottomRightRadius: "6px",
  },
  ".kcm-fence, .kcm-code-info": { color: "var(--k-color-muted)" },
  ".kcm-hr": { borderBottom: "1px solid var(--k-color-border)" },
  // Tables and images are set the way the site's stylesheet sets them.
  ".kcm-table": {
    display: "block",
    maxWidth: "100%",
    borderCollapse: "collapse",
    overflowX: "auto",
    margin: "0",
  },
  ".kcm-table-block": { paddingBottom: "var(--k-space)" },
  ".kcm-table th, .kcm-table td": {
    padding: "calc(var(--k-space) * 0.4) calc(var(--k-space) * 0.75)",
    border: "1px solid var(--k-color-border)",
    textAlign: "left",
  },
  ".kcm-table th": { backgroundColor: "var(--k-color-code-background)" },
  ".kcm-table code": {
    padding: "0.15em 0.35em",
    borderRadius: "4px",
    backgroundColor: "var(--k-color-code-background)",
    fontFamily: "var(--k-font-mono)",
    fontSize: "0.9em",
  },
  ".kcm-table del": { color: "var(--k-color-muted)" },
  ".kcm-image": { maxWidth: "100%", height: "auto", verticalAlign: "bottom" },
  ".kcm-image-missing": {
    display: "inline-flex",
    flexDirection: "column",
    gap: "0.15em",
    maxWidth: "100%",
    padding: "0.5em 0.75em",
    border: "1px dashed var(--k-color-border)",
    borderRadius: "4px",
    color: "var(--k-color-muted)",
    fontSize: "0.9em",
    overflowWrap: "anywhere",
  },
  ".kcm-image-missing-title": {
    fontWeight: "bold",
    color: "var(--k-color-text)",
  },
  ".kcm-checkbox": { marginRight: "0.4em", cursor: "pointer" },
});

/**
 * The page's markdown as editable text. It is plain text for now (the
 * formatting comes later); what it holds is exactly what is saved, so it never
 * changes a character that was not typed. Line breaks are always `\n` here:
 * the page's own line endings are put back when it is saved (see
 * `line-endings.ts`).
 */
export function MarkdownEditor({
  value,
  onChange,
  label = "Markdown",
  theme,
  ref,
}: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // The latest callback, so the editor is made once and never rebuilt for it.
  const report = useRef(onChange);
  report.current = onChange;
  // What it starts with; later changes to `value` go through the effect below.
  const first = useRef({ value, label });

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const editor = new EditorView({
      parent,
      state: EditorState.create({
        doc: first.current.value,
        extensions: [
          history(),
          markdownSupport(),
          formatting,
          tableWidgets(),
          stepIntoTables,
          // Formatting shortcuts, and Enter carrying on a list or a quote.
          // (Tab is left alone: it moves focus out of the text.)
          Prec.high(
            keymap.of([
              { key: "Mod-b", run: (v) => applyFormat(v, "bold") },
              { key: "Mod-i", run: (v) => applyFormat(v, "italic") },
              { key: "Mod-k", run: (v) => applyFormat(v, "link") },
              { key: "Enter", run: continueMarkup },
            ]),
          ),
          // Cmd/Ctrl-click opens a link in a new tab; a plain click is for editing.
          EditorView.domEventHandlers({
            mousedown(event, view) {
              if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) {
                return false;
              }
              const at = view.posAtCoords({
                x: event.clientX,
                y: event.clientY,
              });
              const url = at === null ? undefined : linkAt(view.state, at);
              const target =
                url === undefined
                  ? undefined
                  : safeLinkTarget(url, window.location.href);
              if (target === undefined) return false;
              event.preventDefault();
              window.open(target, "_blank", "noopener,noreferrer");
              return true;
            },
          }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": first.current.label,
            spellcheck: "true",
          }),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((t) => t.annotation(fromOutside))
            ) {
              report.current(update.state.doc.toString());
            }
          }),
          look,
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);

  // Replaces the text when `value` is changed from outside (the page was
  // loaded again), keeping the cursor where it can be.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: [fromOutside.of(true), Transaction.addToHistory.of(false)],
    });
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => view.current?.focus(),
    focusEnd: () => {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch({
        selection: { anchor: editor.state.doc.length },
        scrollIntoView: true,
      });
      editor.focus();
    },
    format: (action) => {
      const editor = view.current;
      if (editor) applyFormat(editor, action);
    },
    selectAll: () => {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch({
        selection: { anchor: 0, head: editor.state.doc.length },
      });
      editor.focus();
    },
  }));

  // The tokens change the size of things, so tell the editor to measure again.
  const variables = editorVariables(theme ?? defaultTheme());
  const tokens = JSON.stringify(variables);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tokens` is what changed.
  useEffect(() => view.current?.requestMeasure(), [tokens]);

  // The page the text sits on: the site's background and text color, and its
  // content width, centred, the way a reader sees it.
  return (
    // A click on the page itself (the room around and below the text) puts the
    // cursor at the end of the text. A shortcut for the mouse: the text is
    // already reachable by keyboard.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above.
    // biome-ignore lint/a11y/useKeyWithClickEvents: see above.
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const editor = view.current;
          if (!editor) return;
          editor.dispatch({
            selection: { anchor: editor.state.doc.length },
            scrollIntoView: true,
          });
          editor.focus();
        }
      }}
      style={{
        ...variables,
        minHeight: "60vh",
        padding: "calc(var(--k-space) * 2) var(--k-space)",
        borderRadius: "0.5rem",
        backgroundColor: "var(--k-color-background)",
        color: "var(--k-color-text)",
        fontFamily: "var(--k-font-body)",
      }}
    >
      <div
        ref={host}
        style={{ maxWidth: "var(--k-max-width)", margin: "0 auto" }}
      />
    </div>
  );
}

export default MarkdownEditor;
