// A textarea always hands back "\n", whatever the file used. To keep a page
// byte-for-byte as it was, remember how it ended its lines and put that back
// when saving.

export interface LineEndings {
  /** What to write for each line break when saving. */
  eol: "\n" | "\r\n";
  /** True when the page mixes styles, so saving will make them all `eol`. */
  mixed: boolean;
}

/** The text as a textarea shows it: every line break is "\n". */
export const forDisplay = (content: string): string =>
  content.replace(/\r\n?/g, "\n");

export function detectLineEndings(content: string): LineEndings {
  const crlf = (content.match(/\r\n/g) ?? []).length;
  const lone = (content.match(/\r(?!\n)|(?<!\r)\n/g) ?? []).length;
  if (crlf === 0) return { eol: "\n", mixed: /\r/.test(content) };
  return { eol: "\r\n", mixed: lone > 0 };
}

/** Puts a page's line endings back on text taken from a textarea. */
export const forSaving = (draft: string, { eol }: LineEndings): string =>
  eol === "\r\n" ? draft.replace(/\n/g, "\r\n") : draft;
