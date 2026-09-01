import { AuthConfig } from "convex/server";

// Self-hosted auth (docs/designs/authentication/LLD.md): the app issues
// its own ES256 session JWTs — no external identity vendor. The issuer
// and audience here MUST match convex/auth.ts (ISSUER / AUDIENCE
// constants) exactly.
//
// The JWKS is the embedded ES256 PUBLIC key (safe to commit). The
// private counterpart lives only in the Convex environment variable
// AUTH_PRIVATE_KEY on each deployment (node actions).
//
// Generate with: uv run scripts/make-auth-keys.py  (prints both).
export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "sgbs-roster",
      issuer: "https://sgbs-roster.vercel.app/",
      algorithm: "ES256",
      jwks: "data:application/json;base64,eyJrZXlzIjpbeyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6IjFuYlZBSDN0elJ1TmVfeXN1eHZJVVNpYjhkZ0V2ZHh2WE1VVmxGdkVQWFUiLCJ5IjoiaExISnI1c0h6dnpTNlNsaGRIVFVMZXZxZnJUWVYwNjRKR0kxeXpYWFV5ZyIsInVzZSI6InNpZyIsImFsZyI6IkVTMjU2Iiwia2lkIjoic2dicy1yb3N0ZXItc2Vzc2lvbi0xIn1dfQ==",
    },
  ],
} satisfies AuthConfig;