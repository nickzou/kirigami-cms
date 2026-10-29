import { Alert } from "./Alert.js";

export function SaveFailedPanel({ message }: { message: string }) {
  return (
    <Alert tone="error">
      <p>Could not save: {message}</p>
      <p>Your changes are still here. Try saving again.</p>
    </Alert>
  );
}
