export interface ThemePreviewProps {
  /** The whole HTML page to show (see `previewDocument`). */
  html: string;
}

/**
 * A page shown with the theme being edited. It is fully sandboxed (no
 * scripts), like the editor's preview, and it is a copy of the page, so
 * nothing in it can reach the admin.
 */
export function ThemePreview({ html }: ThemePreviewProps) {
  return (
    <iframe
      title="Preview of the theme"
      sandbox=""
      srcDoc={html}
      className=":uno: block h-[70vh] min-h-[24rem] w-full rounded-lg border border-solid border-line bg-white shadow"
    />
  );
}
