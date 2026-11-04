import { syntaxTree } from "@codemirror/language";
import {
  type EditorState,
  Prec,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  WidgetType,
} from "@codemirror/view";
import { type Inline, type TableModel, tablesToDraw } from "./table-model.js";

/** Only web addresses load as images; anything else (a file next to the page) cannot be served yet. */
export const isLoadableImage = (src: string): boolean =>
  /^https?:\/\//i.test(src);

/** Where a link opens from the editor: web and mail addresses, and addresses on the same site. Nothing else. */
export function safeLinkTarget(url: string, base: string): string | undefined {
  try {
    const target = new URL(url.trim(), base);
    return ["http:", "https:", "mailto:"].includes(target.protocol)
      ? target.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** What stands in for an image that cannot be shown: its description, where it should come from, and why. */
function missingImage(alt: string, src: string): HTMLElement {
  const box = document.createElement("span");
  box.className = "kcm-image-missing";
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", `Image not available yet: ${alt || src}`);
  const title = document.createElement("span");
  title.className = "kcm-image-missing-title";
  title.textContent = alt || "Image";
  const note = document.createElement("span");
  note.textContent = `Not available yet: ${src}`;
  box.append(title, note);
  return box;
}

/**
 * An image, or the stand-in for one that cannot load (or has not a web
 * address). The element returned stays the same when an image fails and the
 * stand-in takes its place inside it: the editor owns the element it is given
 * for a widget, and one that is swapped for another looks to it like text
 * that was typed.
 */
function imageElement(
  src: string,
  alt: string,
  title: string | undefined,
  onSettled?: () => void,
): HTMLElement {
  const box = document.createElement("span");
  box.className = "kcm-image-box";
  if (!isLoadableImage(src)) {
    box.appendChild(missingImage(alt, src));
    return box;
  }
  const image = document.createElement("img");
  image.className = "kcm-image";
  image.src = src;
  image.alt = alt;
  if (title) image.title = title;
  image.addEventListener("load", () => onSettled?.());
  image.addEventListener("error", () => {
    box.replaceChildren(missingImage(alt, src));
    onSettled?.();
  });
  box.appendChild(image);
  return box;
}

/** `![alt](src "title")`, shown as the image. Clicking it puts the cursor in the text, which shows the markdown. */
export class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly title?: string,
  ) {
    super();
  }
  eq(other: ImageWidget): boolean {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.title === this.title
    );
  }
  toDOM(view: EditorView): HTMLElement {
    return imageElement(this.src, this.alt, this.title, () =>
      view.requestMeasure(),
    );
  }
  ignoreEvent(): boolean {
    return false;
  }
}

/** A task's `[ ]` or `[x]`, shown as a checkbox that toggles the text. */
export class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }
  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked;
  }
  toDOM(view: EditorView): HTMLElement {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "kcm-checkbox";
    box.checked = this.checked;
    // Not a stop on the way through the page: the text is reachable by the keyboard.
    box.tabIndex = -1;
    box.setAttribute("aria-label", this.checked ? "Done" : "Not done");
    // The text is the truth; the box only changes it.
    box.addEventListener("mousedown", (event) => event.preventDefault());
    box.addEventListener("click", (event) => {
      event.preventDefault();
      const at = view.posAtDOM(box);
      const marker = view.state.doc.sliceString(at, at + 3);
      if (!/^\[[ xX]\]$/.test(marker)) return;
      view.dispatch({
        changes: { from: at + 1, to: at + 2, insert: this.checked ? " " : "x" },
        userEvent: "input",
      });
    });
    return box;
  }
}

function appendInlines(
  parent: Node,
  parts: readonly Inline[],
  onSettled: () => void,
) {
  for (const part of parts) {
    switch (part.t) {
      case "text":
        parent.appendChild(document.createTextNode(part.s));
        break;
      case "code": {
        const code = document.createElement("code");
        code.textContent = part.s;
        parent.appendChild(code);
        break;
      }
      case "image":
        parent.appendChild(
          imageElement(part.src, part.alt, part.title, onSettled),
        );
        break;
      case "link": {
        // Not a link to follow: a click in the editor is for editing.
        const link = document.createElement("span");
        link.className = "kcm-link";
        appendInlines(link, part.c, onSettled);
        parent.appendChild(link);
        break;
      }
      default: {
        const tag = { strong: "strong", em: "em", del: "del" }[part.t];
        const element = document.createElement(tag);
        appendInlines(element, part.c, onSettled);
        parent.appendChild(element);
      }
    }
  }
}

/** The table's elements. Cell text is set as text, never as markup. */
export function buildTable(
  model: TableModel,
  onSettled: () => void = () => {},
): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "kcm-table";
  const cell = (tag: "th" | "td", parts: readonly Inline[], column: number) => {
    const element = document.createElement(tag);
    const align = model.align[column];
    if (align) element.style.textAlign = align;
    appendInlines(element, parts, onSettled);
    return element;
  };
  const head = table.createTHead().insertRow();
  for (const [column, parts] of model.head.entries()) {
    head.appendChild(cell("th", parts, column));
  }
  const body = table.createTBody();
  for (const row of model.rows) {
    const tr = body.insertRow();
    for (const [column, parts] of row.entries()) {
      tr.appendChild(cell("td", parts, column));
    }
  }
  return table;
}

/** A table in the text, shown as a table. Clicking it puts the cursor in the text, which shows the markdown. */
export class TableWidget extends WidgetType {
  constructor(readonly model: TableModel) {
    super();
  }
  eq(other: TableWidget): boolean {
    return JSON.stringify(other.model) === JSON.stringify(this.model);
  }
  toDOM(view: EditorView): HTMLElement {
    // The space under a table is padding on a box around it: the editor
    // measures a block widget's height but cannot see a margin, and the
    // page after it would then sit lower than the editor thinks, which
    // sends the cursor to the wrong line when moving up or down.
    const block = document.createElement("div");
    block.className = "kcm-table-block";
    block.appendChild(buildTable(this.model, () => view.requestMeasure()));
    return block;
  }
  ignoreEvent(): boolean {
    return false;
  }
}

const focusChanged = StateEffect.define<boolean>();

interface Tables {
  focused: boolean;
  decorations: DecorationSet;
}

function drawTables(state: EditorState, focused: boolean): DecorationSet {
  return Decoration.set(
    tablesToDraw(state, focused).map(({ from, to, model }) =>
      Decoration.replace({ widget: new TableWidget(model), block: true }).range(
        from,
        to,
      ),
    ),
  );
}

/**
 * Tables shown as tables. A block that spans lines has to come from the state
 * (not a view plugin), so this keeps its own note of the focus: with the
 * editor not in use there is no cursor, and every table is drawn. The cursor
 * in or next to a table, while the editor is in use, shows its markdown.
 */
export const tableWidgets = () => {
  const field = StateField.define<Tables>({
    create: (state) => ({
      focused: false,
      decorations: drawTables(state, false),
    }),
    update(value, transaction) {
      const change = transaction.effects.find((effect) =>
        effect.is(focusChanged),
      );
      const focused = change ? change.value : value.focused;
      if (
        !transaction.docChanged &&
        !transaction.selection &&
        focused === value.focused &&
        syntaxTree(transaction.startState) === syntaxTree(transaction.state)
      ) {
        return value;
      }
      return { focused, decorations: drawTables(transaction.state, focused) };
    },
    // Not atomic: the cursor must be able to step onto a table's edge from the
    // line above or below it, which shows the table as text. (Made atomic, it
    // jumps clean over the table.)
    provide: (f) =>
      EditorView.decorations.from(f, (value) => value.decorations),
  });
  return [
    field,
    EditorView.focusChangeEffect.of((_state, focusing) =>
      focusChanged.of(focusing),
    ),
  ];
};

/**
 * ArrowUp or ArrowDown on the line next to a table puts the cursor on the
 * table's edge, which shows it as text, ready to edit with the keys. (The
 * editor's own vertical movement steps over a table drawn as one block, so
 * without this a table could only be opened with the mouse.)
 */
function stepIntoTable(view: EditorView, direction: 1 | -1): boolean {
  const { state } = view;
  const { main } = state.selection;
  if (!main.empty) return false;
  const line = state.doc.lineAt(main.head);
  for (const { from, to } of tablesToDraw(state, true)) {
    const edge =
      direction < 0 && line.from === to + 1
        ? to
        : direction > 0 && line.to + 1 === from
          ? from
          : undefined;
    if (edge !== undefined) {
      view.dispatch({ selection: { anchor: edge }, scrollIntoView: true });
      return true;
    }
  }
  return false;
}

export const stepIntoTables = Prec.high(
  keymap.of([
    { key: "ArrowUp", run: (view) => stepIntoTable(view, -1) },
    { key: "ArrowDown", run: (view) => stepIntoTable(view, 1) },
  ]),
);
