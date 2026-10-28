import type { Root } from "mdast";
import { toString as plainText } from "mdast-util-to-string";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm);

/**
 * Raw HTML is never rendered: remark-rehype drops it unless told otherwise,
 * and the sanitizer then removes anything unsafe that markdown itself can
 * produce, such as `javascript:` link targets.
 */
const renderer = parser()
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

/** Renders markdown (CommonMark + GFM) to an HTML fragment. */
export function renderMarkdown(source: string): string {
  return String(renderer.processSync(source)).trim();
}

/** Plain text of the first top-level `#` heading, if the page has a non-empty one. */
export function firstHeading(source: string): string | undefined {
  const tree: Root = parser.parse(source);
  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1) {
      const text = plainText(node).trim();
      return text === "" ? undefined : text;
    }
  }
  return undefined;
}
