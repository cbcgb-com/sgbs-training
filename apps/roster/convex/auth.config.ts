import { AuthConfig } from "convex/server";

// Clerk JWT validation. The production Clerk instance's Frontend API
// domain is injected at deploy time via the CLERK_JWT_ISSUER_DOMAIN
// environment variable (set on the Convex production deployment in the
// dashboard; see the authentication LLD). The dev deployment keeps the
// dev instance domain so local/preview auth is unaffected.
//
// NOTE: with the app-origin proxy configured (proxy URL
// https://sgbs-roster.vercel.app/__clerk), tokens are still issued by the
// domain below — the proxy only changes where the BROWSER sends Clerk
// requests, not who signs them.
export default {
  providers: [
    {
      domain:
        (globalThis as Record<string, unknown>).CLERK_JWT_ISSUER_DOMAIN as
          string | undefined ??
        "https://quick-treefrog-3653.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;