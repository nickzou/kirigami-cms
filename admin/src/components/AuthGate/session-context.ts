import { createContext, useContext } from "react";

export interface SessionControls {
  /** A password is set, so there is a session to end. */
  required: boolean;
  signOut: () => Promise<void>;
}

/** Without an `AuthGate` (a story, a test), no password is needed and there is nothing to sign out of. */
export const SessionContext = createContext<SessionControls>({
  required: false,
  signOut: async () => {},
});

export const useSession = (): SessionControls => useContext(SessionContext);
