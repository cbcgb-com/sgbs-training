import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { StrictMode, useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { sessionTokenStore } from "./auth/session";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Self-hosted passwordless auth (docs/designs/authentication/LLD.md):
// the client holds the signed session JWT in localStorage and hands it
// to Convex as the access token. `isAuthenticated` is true only while a
// token exists; Convex decides what the identity may see.
function useLocalAuth() {
  const [token, setToken] = useState<string | null>(() =>
    sessionTokenStore.get(),
  );

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        // A forced refresh means the current token expired. There is no
        // silent re-issue path here: the member signs in again (one
        // email lookup). Clear so the UI returns to the sign-in sheet.
        sessionTokenStore.clear();
        setToken(null);
        return null;
      }
      return sessionTokenStore.get();
    },
    [],
  );

  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: token !== null,
      fetchAccessToken,
    }),
    [token, fetchAccessToken],
  );
}

// The sign-in components swap the token after signIn /
// verifyRegistrationCode succeed; onSignedIn persists it and reloads so
// ConvexProviderWithAuth re-initializes with the new token.
export function authActions() {
  return {
    onSignedIn(token: string) {
      sessionTokenStore.set(token);
      window.location.reload();
    },
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProviderWithAuth client={convex} useAuth={useLocalAuth}>
      <App />
    </ConvexProviderWithAuth>
  </StrictMode>,
);