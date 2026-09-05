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

// One-time cleanup (2026-09-05) accompanying the schema slim-down:
// 1. Harmonize the legacy scalar dates (leadingDate/observingDate, from
//    Airtable 带领日期/观察的日期) into the leadingSessions/
//    observingSessions arrays.
// 2. Strip the no-longer-relevant homework columns (homeworkSubmitted,
//    homeworkCount) and the scalar date fields.
// 3. Backfill createdTime on app-created rows (which never set it) from
//    the system _creationTime; imported Airtable rows keep their true
//    value.
// Safe to re-run — every pass no-ops when nothing matches. Run via:
//   npx convex run migrations:cleanupStudentFields [--prod]
export const cleanupStudentFields = internalMutation({
  handler: async (ctx) => {
    let seen = 0;
    let harmonized = 0;
    let stripped = 0;
    let createdBackfilled = 0;
    for (const s of await ctx.db.query("students").collect()) {
      seen++;
      // Cast needed: these fields are deliberately absent from the
      // schema, but legacy documents still carry them until this
      // migration strips them (same pattern as dropLegacyClerkIds).
      const legacy = s as {
        leadingDate?: string;
        observingDate?: string;
        homeworkSubmitted?: string[];
        homeworkCount?: number;
        createdTime?: string;
      };
      const patch: Record<string, unknown> = {};

      // Merge the scalar date into the session array (dedupe; sorted
      // oldest-first when every entry is an ISO date).
      const merge = (
        scalar: string | undefined,
        sessions: string[] | undefined,
      ): string[] | undefined => {
        if (!scalar) return undefined;
        const merged = [...new Set([...(sessions ?? []), scalar])];
        if (merged.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
          merged.sort();
        }
        return merged;
      };
      const leading = merge(legacy.leadingDate, s.leadingSessions);
      if (leading) patch.leadingSessions = leading;
      const observing = merge(legacy.observingDate, s.observingSessions);
      if (observing) patch.observingSessions = observing;

      // Unset the fields removed from the schema.
      if (
        legacy.leadingDate !== undefined ||
        legacy.observingDate !== undefined ||
        legacy.homeworkSubmitted !== undefined ||
        legacy.homeworkCount !== undefined
      ) {
        patch.leadingDate = undefined;
        patch.observingDate = undefined;
        patch.homeworkSubmitted = undefined;
        patch.homeworkCount = undefined;
        stripped++;
      }

      // App-created rows never set createdTime; backfill it from the
      // system creation time so every row carries its true date.
      if (legacy.createdTime === undefined) {
        patch.createdTime = new Date(s._creationTime).toISOString();
        createdBackfilled++;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(
          s._id,
          patch as unknown as Partial<Doc<"students">>,
        );
        if (leading || observing) harmonized++;
      }
    }
    return { seen, harmonized, stripped, createdBackfilled };
  },
});