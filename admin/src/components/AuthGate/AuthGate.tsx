import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSession,
  onSignedOut,
  type Session,
  signIn,
  signOut,
} from "../../api.js";
import { Dialog } from "../Dialog/Dialog.js";
import { LoadingMessage } from "../LoadingMessage/LoadingMessage.js";
import { SignIn, SignInForm } from "../SignIn/SignIn.js";
import { SessionContext } from "./session-context.js";

/**
 * Asks the server whether a password is needed. If one is and you are not
 * signed in, the sign-in screen is shown instead of the admin (at the same
 * address, so signing in lands you where you were going). Once in, a request
 * the server turns away because the session ended opens a sign-in dialog over
 * the screen you are on, which stays as it was, so unsaved text is not lost.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>();
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getSession(controller.signal).then(setSession, () => {
      // Cannot ask (the server is down, or too old to know): show the admin,
      // whose screens say what they cannot load.
      if (!controller.signal.aborted)
        setSession({ required: false, signedIn: true });
    });
    return () => controller.abort();
  }, []);

  useEffect(() => onSignedOut(() => setEnded(true)), []);

  const logIn = useCallback(async (password: string) => {
    setSession(await signIn(password));
    setEnded(false);
  }, []);

  const controls = useMemo(
    () => ({
      required: session?.required ?? false,
      signOut: async () => {
        await signOut();
        setEnded(false);
        setSession({ required: true, signedIn: false });
      },
    }),
    [session?.required],
  );

  if (!session) {
    return (
      <div className=":uno: p-4">
        <LoadingMessage />
      </div>
    );
  }
  if (session.required && !session.signedIn) return <SignIn onSignIn={logIn} />;

  return (
    <SessionContext.Provider value={controls}>
      {children}
      {ended && (
        <Dialog title="Sign in again" onClose={() => setEnded(false)}>
          <p className=":uno: mt-0 text-muted">
            Your session ended. Sign in to carry on; what you were working on is
            still here.
          </p>
          <SignInForm onSignIn={logIn} />
        </Dialog>
      )}
    </SessionContext.Provider>
  );
}
