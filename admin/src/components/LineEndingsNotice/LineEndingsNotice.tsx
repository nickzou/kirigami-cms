import type { LineEndings } from "../../line-endings.js";
import { Alert } from "../Alert/Alert.js";

/** Warns that a page mixes line endings, which saving will make uniform. */
export function LineEndingsNotice({ eol }: Pick<LineEndings, "eol">) {
  return (
    <Alert tone="warning">
      This page mixes line endings. Saving will use{" "}
      {eol === "\r\n" ? "Windows (CRLF)" : "Unix (LF)"} line endings throughout.
    </Alert>
  );
}
