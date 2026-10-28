import { Alert } from "./Alert.js";
import { Button } from "./Button.js";

export interface ErrorPanelProps {
  message: string;
  /** When given, a "Try again" button is shown. */
  onRetry?: () => void;
}

/** A failed load, with a way to try again when trying again could help. */
export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <Alert tone="error">
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </Alert>
  );
}
