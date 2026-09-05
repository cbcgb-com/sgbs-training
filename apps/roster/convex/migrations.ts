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
// 2. Strip the fields dropped from the schema: the homework columns
//    (homeworkSubmitted/homeworkCount), the scalar date fields, the
//    provenance `source`, and the legacy `teachingAssistants` links.
// 3. Set `present` to true on every row.
// 4. Backfill `class1`-`class5` = true for rows whose five attendance
//    marks are ALL blank (attendance never recorded); rows with any
//    mark recorded are left untouched. `missed` (the replicated
//    unchecked-class count) is recomputed to 0 for those rows so the
//    缺課 column agrees with the all-attended marks.
// 5. Backfill createdTime on app-created rows (which never set it) from
//    the system _creationTime; imported Airtable rows keep their true
//    value.
// Safe to re-run — every pass no-ops when nothing matches. Run via:
//   npx convex run migrations:cleanupStudentFields [--prod]
export const cleanupStudentFields = internalMutation({
  handler: async (ctx) => {
    let seen = 0;
    let harmonized = 0;
    let stripped = 0;
    let presentSet = 0;
    let classesBackfilled = 0;
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
        source?: string;
        teachingAssistants?: string[];
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
        legacy.homeworkCount !== undefined ||
        legacy.source !== undefined ||
        legacy.teachingAssistants !== undefined
      ) {
        patch.leadingDate = undefined;
        patch.observingDate = undefined;
        patch.homeworkSubmitted = undefined;
        patch.homeworkCount = undefined;
        patch.source = undefined;
        patch.teachingAssistants = undefined;
        stripped++;
      }

      // 出席: true on every row.
      if (s.present !== true) {
        patch.present = true;
        presentSet++;
      }

      // class1-5: backfill true only when ALL five marks are blank
      // (attendance never recorded); recompute the replicated missed
      // count so it agrees with the marks.
      if (
        s.class1 === undefined &&
        s.class2 === undefined &&
        s.class3 === undefined &&
        s.class4 === undefined &&
        s.class5 === undefined
      ) {
        patch.class1 = true;
        patch.class2 = true;
        patch.class3 = true;
        patch.class4 = true;
        patch.class5 = true;
        patch.missed = 0;
        classesBackfilled++;
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
    return {
      seen,
      harmonized,
      stripped,
      presentSet,
      classesBackfilled,
      createdBackfilled,
    };
  },
});