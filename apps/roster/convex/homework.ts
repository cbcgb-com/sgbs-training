import { internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { CURRENT_QUARTER } from "../src/constants";
import { requireInstructor } from "./students";

// 功課記錄: homework tracking parallel to attendance. One row per
// (student, session date, homework type):
//
//   notes    查經筆記 — one page per student in the weekly shared doc;
//            done = the student filled in their own page.
//   questions 查經題目 — one page per group, prepped by the session's
//            主領 and reviewed by the 觀察; done = the leader/observer
//            actually contributed to their group's page.
//
// A missing row means 未記錄 — never conflated with 未完成. The rows are
// written by the agent workflow (Eric hands over the weekly Google Docs,
// the agent reads who filled in what, and calls recordHomework through
// `npx convex run`), not by hand — so every write function here is
// internal: the browser client cannot touch homework at all. Instructors
// read the marks in 課堂安排 按週次 via `byQuarter`. See
// docs/designs/homework/LLD.md.

// ---- Agent read: name → student mapping -------------------------------

// Active students of a quarter with their group — the agent's lookup
// table for turning the names on a Google Doc page into student ids.
// Internal: the roster is instructor-only data, and the CLI caller
// bypasses the browser auth gates by design.
export const quarterRoster = internalQuery({
  args: { quarter: v.optional(v.string()) },
  handler: async (ctx, { quarter }) => {
    const q = quarter ?? CURRENT_QUARTER;
    const students = await ctx.db
      .query("students")
      .withIndex("by_quarter", (x) => x.eq("quarter", q))
      .collect();
    return students
      .filter((s) => s.withdrawnAt === undefined)
      .map((s) => ({
        _id: s._id,
        name: s.name,
        groupName: s.groupName ?? "",
        fellowship: s.fellowship ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  },
});

// ---- Instructor read: the week-view marks -----------------------------

// All homework rows of a quarter (default: current). The UI builds a
// `${studentId}:${date}:${type}` → done map; absence from the map is the
// third state (未記錄). Instructor-gated like every roster read.
export const byQuarter = query({
  args: { quarter: v.optional(v.string()) },
  handler: async (ctx, { quarter }) => {
    await requireInstructor(ctx);
    const q = quarter ?? CURRENT_QUARTER;
    const rows = await ctx.db
      .query("homework")
      .withIndex("by_quarter_date", (x) => x.eq("quarter", q))
      .collect();
    return rows.map((r) => ({
      studentId: r.studentId,
      date: r.date,
      type: r.type,
      done: r.done,
    }));
  },
});

// ---- Agent writes ------------------------------------------------------

// Shared validation + upsert for recordHomework. The date must be an
// active session date of the student's quarter; 查經題目 credit is
// limited to that session's 主領 and 觀察 (settled: both roles get
// credit). Upsert is keyed on (studentId, date, type) so re-running a
// week updates in place, never duplicates.
async function upsertHomework(
  ctx: MutationCtx,
  studentId: Id<"students">,
  date: string,
  type: "notes" | "questions",
  done: boolean,
  sourceDocUrl?: string,
): Promise<"created" | "updated" | "unchanged"> {
  const student = await ctx.db.get(studentId);
  if (!student) throw new Error("找不到此學員");
  const quarter = student.quarter;
  if (!quarter) throw new Error("學員沒有所屬季度");
  const session = (
    await ctx.db
      .query("sessions")
      .withIndex("by_quarter", (x) => x.eq("quarter", quarter))
      .collect()
  ).find((s) => s.date === date);
  if (!session) throw new Error("此日期不是該季的上課日期");
  if (
    type === "questions" &&
    !session.leaderIds.includes(studentId) &&
    !session.observerIds.includes(studentId)
  ) {
    throw new Error("查經題目僅限該週的主領或觀察");
  }

  const existing = (
    await ctx.db
      .query("homework")
      .withIndex("by_student", (x) => x.eq("studentId", studentId))
      .collect()
  ).find((h) => h.date === date && h.type === type);

  if (existing) {
    if (existing.done === done && existing.sourceDocUrl === sourceDocUrl) {
      return "unchanged";
    }
    await ctx.db.patch(existing._id, { done, sourceDocUrl, recordedAt: Date.now() });
    return "updated";
  }
  await ctx.db.insert("homework", {
    studentId,
    quarter,
    date,
    type,
    done,
    sourceDocUrl,
    recordedAt: Date.now(),
  });
  return "created";
}

// Write one homework record. Called by the agent workflow:
//   npx convex run homework:recordHomework '{
//     "studentId": "...", "date": "2026-10-04",
//     "type": "notes", "done": true,
//     "sourceDocUrl": "https://docs.google.com/..."
//   }'
// One row per call — a loop of independent calls is resumable mid-week,
// which suits the agent re-running a week after doc corrections.
export const recordHomework = internalMutation({
  args: {
    studentId: v.id("students"),
    date: v.string(),
    type: v.union(v.literal("notes"), v.literal("questions")),
    done: v.boolean(),
    sourceDocUrl: v.optional(v.string()),
  },
  handler: async (ctx, { studentId, date, type, done, sourceDocUrl }) =>
    upsertHomework(ctx, studentId, date, type, done, sourceDocUrl),
});

// Retract one homework row — back to 未記錄. The escape hatch when a
// record was written for someone who should not have one at all (wrong
// person, wrong page); correcting done is just recordHomework again.
// Clearing a row that was never recorded is a no-op. Test cleanup uses
// the same path.
export const clearHomework = internalMutation({
  args: {
    studentId: v.id("students"),
    date: v.string(),
    type: v.union(v.literal("notes"), v.literal("questions")),
  },
  handler: async (ctx, { studentId, date, type }) => {
    const existing = (
      await ctx.db
        .query("homework")
        .withIndex("by_student", (x) => x.eq("studentId", studentId))
        .collect()
    ).find((h) => h.date === date && h.type === type);
    if (!existing) return "unchanged";
    await ctx.db.delete(existing._id);
    return "deleted";
  },
});
