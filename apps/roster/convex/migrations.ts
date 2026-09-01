import { internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// One-time cleanup (2026-08-31): remove the legacy `clerkId` field from
// student rows after dropping the column from the schema. Identity is
// now the email itself (docs/designs/authentication/LLD.md). Safe to
// re-run — it no-ops when nothing matches.
// Run via: npx convex run migrations:dropLegacyClerkIds
export const dropLegacyClerkIds = internalMutation({
  handler: async (ctx) => {
    let removed = 0;
    let seen = 0;
    // Cast needed: the field is deliberately absent from the schema, but
    // legacy documents still carry it until this migration strips it.
    for (const s of await ctx.db.query("students").collect()) {
      seen++;
      if ((s as { clerkId?: string }).clerkId !== undefined) {
        await ctx.db.patch(
          s._id,
          { clerkId: undefined } as unknown as Partial<Doc<"students">>,
        );
        removed++;
      }
    }
    return { seen, removed };
  },
});