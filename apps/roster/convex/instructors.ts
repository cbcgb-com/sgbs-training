// 同工 / instructor allowlist maintenance. Rows in the `instructors` table
// gate every instructor-only query and mutation (students.ts
// requireInstructor) and allow sign-in without a student registration
// (auth.ts signIn).
//
// There is no client UI for this by design — the allowlist is managed from
// the CLI (add --prod for the production deployment):
//   npx convex run instructors:upsert '{"email":"…","name":"…","active":true}'
// Deactivated rows (active=false) are kept for history but have no access.

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { CURRENT_QUARTER } from "../src/constants";

export const upsert = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, { email, name, active }) => {
    const addr = email.trim().toLowerCase();
    const row = await ctx.db
      .query("instructors")
      .withIndex("by_email", (q) => q.eq("email", addr))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        active,
        ...(name !== undefined ? { name } : {}),
      });
      return row._id;
    }
    return await ctx.db.insert("instructors", { email: addr, name, active });
  },
});

// ---- Session scaffolding ----

// Create a class date for the season from the CLI. Idempotent per
// quarter+date (skips when the session already exists):
//   npx convex run instructors:createSession '{"date":"2026-09-20"}'
export const createSession = internalMutation({
  args: { date: v.string(), quarter: v.optional(v.string()) },
  handler: async (ctx, { date, quarter }) => {
    const q = quarter ?? CURRENT_QUARTER;
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_quarter", (qq) => qq.eq("quarter", q))
      .collect();
    if (existing.some((s) => s.date === date)) return null;
    return await ctx.db.insert("sessions", {
      date,
      quarter: q,
      leaderIds: [],
      observerIds: [],
    });
  },
});
