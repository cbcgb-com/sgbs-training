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

  const fetchAccessToken = useCallback(async () => {
    // forceRefreshToken means "bypass cache", not "session expired" — the
    // JWT's exp claim is the expiry gate (server-side). We simply return
    // the stored token; sign-out clears it explicitly.
    return sessionTokenStore.get();
  }, []);

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