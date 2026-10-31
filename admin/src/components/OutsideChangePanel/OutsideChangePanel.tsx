import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";

export interface OutsideChangePanelProps {
  /** True when the page is no longer there, so there is nothing newer to load. */
  gone: boolean;
  onLoadLatest: () => void;
  onCopy: () => void;
  onKeepEditing: () => void;
}

/**
 * Shown when the page changed outside the admin (in another editor, say) while
 * there is unsaved text, before a save is refused for it. The text stays.
 */
export function OutsideChangePanel({
  gone,
  onLoadLatest,
  onCopy,
  onKeepEditing,
}: OutsideChangePanelProps) {
  return (
    <Alert tone="warning">
      <p>
        {gone
          ? "This page was deleted or renamed outside the admin."
          : "This page changed outside the admin."}{" "}
        Your text is still here, and nothing was lost.
      </p>
      <div className=":uno: flex flex-wrap items-center gap-3">
        {!gone && (
          <Button onClick={onLoadLatest}>
            Load the latest and discard my changes
          </Button>
        )}
        <Button onClick={onCopy}>Copy my text</Button>
        <Button onClick={onKeepEditing}>Keep editing</Button>
      </div>
    </Alert>
  );
}
