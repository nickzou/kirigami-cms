import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";

export interface ConflictPanelProps {
  /** True when the page no longer exists, so there is nothing newer to load. */
  gone: boolean;
  onLoadLatest: () => void;
  onCopy: () => void;
  onKeepEditing: () => void;
}

/** Shown when a save was refused because the page changed underneath it. */
export function ConflictPanel({
  gone,
  onLoadLatest,
  onCopy,
  onKeepEditing,
}: ConflictPanelProps) {
  return (
    <Alert tone="error">
      <p>
        {gone
          ? "This page was deleted or renamed since you opened it."
          : "This page changed since you opened it, so nothing was saved."}{" "}
        Your changes are still in the editor.
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
