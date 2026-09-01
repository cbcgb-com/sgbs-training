// Session-token storage for the self-hosted passwordless auth
// (docs/designs/authentication/LLD.md). The JWT's payload claims (email,
// name, exp) are decoded client-side for display only — every access
// decision is re-derived server-side from the verified token.

const KEY = "sgbs.auth.token";

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const sessionTokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      // Private-mode storage limits: session lives until close.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
  email(): string | null {
    const token = this.get();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    return typeof payload?.email === "string" ? payload.email : null;
  },
  /** jti claim — needed for server-side revocation on sign-out. */
  jti(): string | null {
    const token = this.get();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    return typeof payload?.jti === "string" ? payload.jti : null;
  },
  isExpired(): boolean {
    const token = this.get();
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    return typeof payload?.exp === "number" && payload.exp * 1000 < Date.now();
  },
};

/** Persist a fresh session token and reload so the auth provider picks it up. */
export function signInWithToken(token: string) {
  sessionTokenStore.set(token);
  window.location.reload();
}