import { AuthConfig } from "convex/server";

// Clerk dev instance for the sgbs-roster app (quaint-treefrog-3653).
// When we graduate to a production Clerk instance, switch this to the
// CLERK_JWT_ISSUER_DOMAIN env-var pattern from
// docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances.
export default {
  providers: [
    {
      domain: "https://quick-treefrog-3653.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
