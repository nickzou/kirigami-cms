import type { Heading, Root } from "mdast";
import { toString as plainText } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export interface Section {
  /** Plain text of the `##` heading, with inline formatting removed. */
  heading: string;
  /** 1-based line number of the heading in the page. */
  line: number;
  /** The exact source of the section: the heading line(s) and everything up to the next `##`. */
  markdown: string;
  /** `markdown` without the heading, starting at the line after it. */
  body: string;
}

export interface Page {
  /** Everything before the first `##` heading. */
  intro: string;
  sections: Section[];
}

const parser = unified().use(remarkParse).use(remarkGfm);

/**
 * Splits a page into an intro and one section per top-level `##` heading.
 *
 * The result is cut from the original text, never regenerated from the parse
 * tree: `intro` followed by every section's `markdown` is the source, byte for
 * byte. Headings inside code blocks, quotes and lists are not section breaks.
 */
export function splitSections(source: string): Page {
  const tree: Root = parser.parse(source);

  const headings = tree.children.filter(
    (node): node is Heading => node.type === "heading" && node.depth === 2,
  );

  const starts = headings.map((heading) => offsetOf(heading, "start"));
  const first = starts[0];
  if (first === undefined) return { intro: source, sections: [] };

  const sections = headings.map((heading, i): Section => {
    const start = starts[i] ?? 0;
    const end = starts[i + 1] ?? source.length;
    const headingEnd = offsetOf(heading, "end");
    return {
      heading: plainText(heading),
      line: heading.position?.start.line ?? 1,
      markdown: source.slice(start, end),
      body: source.slice(afterLineBreak(source, headingEnd, end), end),
    };
  });

  return { intro: source.slice(0, first), sections };
}

function offsetOf(node: Heading, edge: "start" | "end"): number {
  const offset = node.position?.[edge].offset;
  if (offset === undefined)
    throw new Error("Markdown parser returned a node without a position");
  return offset;
}

/** Skips one line break (`\n` or `\r\n`) at `from`, if there is one before `limit`. */
function afterLineBreak(source: string, from: number, limit: number): number {
  if (source.startsWith("\r\n", from)) return Math.min(from + 2, limit);
  if (source.startsWith("\n", from)) return Math.min(from + 1, limit);
  return from;
}
