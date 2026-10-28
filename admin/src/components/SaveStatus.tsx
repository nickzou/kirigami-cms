/**
 * A live region that announces a finished save. It is always rendered, so
 * screen readers notice the text appearing.
 */
export function SaveStatus({ saved }: { saved: boolean }) {
  return (
    <div role="status" className="muted save-status">
      {saved && "Saved."}
    </div>
  );
}
