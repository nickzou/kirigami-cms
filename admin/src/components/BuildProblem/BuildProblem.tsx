import { Alert } from "../Alert/Alert.js";

/** The site failed to build; the preview is still the last good build. */
export function BuildProblem({ message }: { message: string }) {
  return (
    <Alert tone="error">
      <p className=":uno: font-bold">The site failed to build</p>
      <pre className=":uno: m-0 whitespace-pre-wrap font-mono text-sm">
        {message}
      </pre>
      <p>The preview shows the last good build. Fix it and save.</p>
    </Alert>
  );
}
