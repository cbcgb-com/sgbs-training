import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { CURRENT_QUARTER } from "../src/constants";
import {
  parseFeedbackAnswers,
  shouldShowFeedbackPrompt,
  type FeedbackAnswers,
} from "../src/feedbackFields";
import { readTodayNy, studentWithdrawalStatus } from "./attendanceStatus";
import { requireCurrentStudent, requireInstructor } from "./students";

const answersValidator = {
  newPractice: v.string(),
  leadingFocus: v.string(),
  courseImprovements: v.string(),
  encouragement: v.string(),
};

function asAnswers(row: FeedbackAnswers): FeedbackAnswers {
  return {
    newPractice: row.newPractice,
    leadingFocus: row.leadingFocus,
    courseImprovements: row.courseImprovements,
    encouragement: row.encouragement,
  };
}

async function lastLessonOfCurrentQuarter(
  ctx: QueryCtx,
): Promise<string | null> {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_quarter", (q) => q.eq("quarter", CURRENT_QUARTER))
    .collect();
  const dates = sessions.map((s) => s.date).sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

// The signed-in caller's own reflection for the current quarter, plus
// the prompt/window flags the 我的資料 slip and 回饋 tab use. Soft
// states (unregistered, withdrawn) return registered:false rather than
// throwing — the prompt card lives on a page that may still render.
export const mine = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("請先登入");
    const lastLessonDate = await lastLessonOfCurrentQuarter(ctx);
    const todayNy = await readTodayNy(ctx);
    const showPrompt = shouldShowFeedbackPrompt(todayNy, lastLessonDate);
    const empty = {
      quarter: CURRENT_QUARTER,
      registered: false,
      open: false,
      showPrompt,
      lastLessonDate,
      response: null as null | (FeedbackAnswers & {
        submittedAt: number;
        updatedAt: number;
      }),
    };

    const email = identity.email ?? "";
    const mineRow = (
      await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    ).find((s) => s.quarter === CURRENT_QUARTER);
    if (!mineRow) return empty;
    if ((await studentWithdrawalStatus(ctx, mineRow)).withdrawn) {
      return empty;
    }

    const existing = await ctx.db
      .query("feedback")
      .withIndex("by_student_quarter", (q) =>
        q.eq("studentId", mineRow._id).eq("quarter", CURRENT_QUARTER),
      )
      .unique();

    return {
      quarter: CURRENT_QUARTER,
      registered: true,
      open: true,
      showPrompt,
      lastLessonDate,
      response: existing
        ? {
            ...asAnswers(existing),
            submittedAt: existing.submittedAt,
            updatedAt: existing.updatedAt,
          }
        : null,
    };
  },
});

// Student upsert of their own current-quarter reflection. Identity is
// the session; the client never names a student or a quarter.
export const submit = mutation({
  args: answersValidator,
  handler: async (ctx, raw) => {
    const me = await requireCurrentStudent(ctx);
    const answers = parseFeedbackAnswers(raw);
    const now = Date.now();
    const existing = await ctx.db
      .query("feedback")
      .withIndex("by_student_quarter", (q) =>
        q.eq("studentId", me._id).eq("quarter", CURRENT_QUARTER),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...answers, updatedAt: now });
      return { status: "updated" as const };
    }
    await ctx.db.insert("feedback", {
      studentId: me._id,
      quarter: CURRENT_QUARTER,
      ...answers,
      submittedAt: now,
      updatedAt: now,
    });
    return { status: "created" as const };
  },
});

// Instructor list for a quarter (default: current). Name/group/fellowship
// come from the student row so the slip can stand alone; no email.
export const byQuarter = query({
  args: { quarter: v.optional(v.string()) },
  handler: async (ctx, { quarter }) => {
    await requireInstructor(ctx);
    const q = quarter ?? CURRENT_QUARTER;
    const rows = await ctx.db
      .query("feedback")
      .withIndex("by_quarter", (x) => x.eq("quarter", q))
      .collect();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const student = await ctx.db.get(row.studentId);
        return {
          _id: row._id,
          studentId: row.studentId,
          quarter: row.quarter,
          name: student?.name ?? "",
          groupName: student?.groupName ?? "",
          fellowship: student?.fellowship ?? "",
          ...asAnswers(row),
          submittedAt: row.submittedAt,
          updatedAt: row.updatedAt,
        };
      }),
    );
    return enriched.sort((a, b) => b.submittedAt - a.submittedAt);
  },
});
