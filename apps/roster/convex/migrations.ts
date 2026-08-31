import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { CURRENT_QUARTER } from "../src/constants";

// One-time migration: convert session temp Airtable-id arrays into Convex
// student-id references. Run via `npx convex run migrations:wireSessionAssignments`.
export const wireSessionAssignments = internalMutation({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    const students = await ctx.db.query("students").collect();
    const byAirtableId = new Map(
      students
        .filter((s) => s.airtableId !== undefined)
        .map((s) => [s.airtableId as string, s._id]),
    );
    let wired = 0;
    let unmatched = 0;
    for (const s of sessions) {
      if (s.leaderAirtableIds === undefined && s.observerAirtableIds === undefined) {
        continue;
      }
      const toIds = (ids: string[]) =>
        (ids
          .map((id) => byAirtableId.get(id))
          .filter((x) => x !== undefined) as Id<"students">[]);
      const leaderIds = toIds(s.leaderAirtableIds ?? []);
      const observerIds = toIds(s.observerAirtableIds ?? []);
      unmatched +=
        (s.leaderAirtableIds?.length ?? 0) -
        leaderIds.length +
        ((s.observerAirtableIds?.length ?? 0) - observerIds.length);
      await ctx.db.patch(s._id, {
        leaderIds,
        observerIds,
        leaderAirtableIds: undefined,
        observerAirtableIds: undefined,
      });
      wired++;
    }
    return { wired, unmatched };
  },
});

// One-time seeding of the instructor (同工) allow-list. Run via
// `npx convex run migrations:seedInstructors '{"instructors":[...]}'`.
// Admin group assignment (instructor UI for this is a future addition).
// Run via `npx convex run migrations:assignGroup '{"email":"...","groupName":"..."}'`.
export const assignGroup = internalMutation({
  args: { email: v.string(), groupName: v.string() },
  handler: async (ctx, { email, groupName }) => {
    const all = await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const targets = all.filter((s) => s.quarter === CURRENT_QUARTER);
    for (const t of targets) {
      await ctx.db.patch(t._id, { groupName });
    }
    return { updated: targets.length };
  },
});

// Mark instructors active/inactive. Run via
// `npx convex run migrations:setActiveInstructors '{"activeEmails":["..."]}'`.
// Instructors not in the list are kept as records but set inactive.
export const setActiveInstructors = internalMutation({
  args: { activeEmails: v.array(v.string()) },
  handler: async (ctx, { activeEmails }) => {
    const instructors = await ctx.db.query("instructors").collect();
    let active = 0;
    let inactive = 0;
    for (const row of instructors) {
      const shouldBeActive = activeEmails.includes(row.email);
      if (row.active !== shouldBeActive) {
        await ctx.db.patch(row._id, { active: shouldBeActive });
      }
      shouldBeActive ? active++ : inactive++;
    }
    const missing = activeEmails.filter((email) => !instructors.some((r) => r.email === email));
    return { active, inactive, missing };
  },
});

// Data fix (Eric, 2026-08-30): missed=5 is impossible — "5" meant attendance
// was never recorded, not that someone missed every class. The policy is
// students are out after ~3 misses, so 5 is false data. Zero them out.
// Run via `npx convex run migrations:fixFalseMissed '{}'`.
export const fixFalseMissed = internalMutation({
  handler: async (ctx) => {
    const students = await ctx.db.query("students").collect();
    let fixed = 0;
    const distribution: Record<string, number> = {};
    for (const s of students) {
      distribution[String(s.missed)] = (distribution[String(s.missed)] ?? 0) + 1;
      if (s.missed === 5) {
        await ctx.db.patch(s._id, { missed: 0 });
        fixed++;
      }
    }
    return { fixed, distributionBefore: distribution };
  },
});

export const seedInstructors = internalMutation({
  args: {
    instructors: v.array(
      v.object({ email: v.string(), name: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, { instructors }) => {
    let added = 0;
    for (const { email, name } of instructors) {
      const existing = await ctx.db
        .query("instructors")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!existing) {
        await ctx.db.insert("instructors", { email, name });
        added++;
      }
    }
    return { added };
  },
});
