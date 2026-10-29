/**
 * A live region that announces a finished save. It is always rendered, so
 * screen readers notice the text appearing.
 */
export function SaveStatus({ saved }: { saved: boolean }) {
  return (
    <div role="status" className=":uno: min-h-6 text-muted">
      {saved && "Saved."}
    </div>
  );
}
