export interface PreviewFrameProps {
  /** Where the dev server shows the page, e.g. `/blog/hello/`. */
  url: string;
  /** Change this to reload the preview. */
  version: number;
  /** Names the frame for screen readers. */
  title: string;
}

/**
 * The page as the site shows it. The frame is fully sandboxed: no scripts
 * run in it, so the dev live-reload script and its overlay cannot start (the
 * admin reloads the frame itself), and the page cannot reach the admin.
 */
export function PreviewFrame({ url, version, title }: PreviewFrameProps) {
  return (
    <iframe
      // A new key makes a new frame, which loads the page again.
      key={version}
      src={url}
      title={title}
      sandbox=""
      className=":uno: block min-h-[60vh] w-full rounded-lg border border-solid border-line bg-white shadow"
    />
  );
}
