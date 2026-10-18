// Convex loaders + write-path side effects for derived withdrawal.
// Pure derivation lives in src/attendanceStatus.ts so the UI, homework
// email list (#177 / classEmailList), and tests share one helper.
//
// "Today" for queries is the `appMeta` todayNy row, refreshed hourly in
// America/New_York. Mutations also write that row so a class-day mark
// cannot race the cron. Do not call Date.now() inside queries if the
// result should change when the calendar day rolls.

import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { CURRENT_QUARTER } from "../src/constants";
import { MIN_ACTIVE_MEMBERS } from "../src/groupCoverage";
import {
  canRecordPresent,
  nyDateFromMs,
  quarterAppliesAbsenceRule,
  withdrawalStatus,
  type WithdrawalStatus,
} from "../src/attendanceStatus";

export {
  ABSENCE_RULE_START_QUARTER,
  MISS_WITHDRAWAL_THRESHOLD,
  SITTING_IN_ERROR,
  MANUAL_WITHDRAWN_ATTENDANCE_ERROR,
  FUTURE_BULK_ERROR,
  canRecordPresent,
  isLockedSittingInDate,
  missedSessionDates,
  nyDateFromMs,
  quarterAppliesAbsenceRule,
  withdrawalStatus,
} from "../src/attendanceStatus";

type Ctx = QueryCtx | MutationCtx;

const META_TODAY = "todayNy";
const META_OVERRIDE = "todayNyOverride";

async function getMeta(ctx: Ctx, key: string): Promise<string | null> {
  const row = await ctx.db
    .query("appMeta")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.value ?? null;
}

async function putMeta(
  ctx: MutationCtx,
  key: string,
  value: string,
): Promise<void> {
  const existing = await ctx.db
    .query("appMeta")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const now = Date.now();
  if (existing) {
    if (existing.value !== value) {
      await ctx.db.patch(existing._id, { value, updatedAt: now });
    }
  } else {
    await ctx.db.insert("appMeta", { key, value, updatedAt: now });
  }
}

async function clearMeta(ctx: MutationCtx, key: string): Promise<void> {
  const existing = await ctx.db
    .query("appMeta")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (existing) await ctx.db.delete(existing._id);
}

// Queries read this. Override (tests) wins; else the cron/mutation row;
// else a one-shot clock fallback so a fresh backend is not empty until
// the first hourly tick (that fallback is not reactive).
export async function readTodayNy(ctx: Ctx): Promise<string> {
  const override = await getMeta(ctx, META_OVERRIDE);
  if (override) return override;
  const stored = await getMeta(ctx, META_TODAY);
  if (stored) return stored;
  return nyDateFromMs(Date.now());
}

export async function writeTodayNy(ctx: MutationCtx): Promise<string> {
  const date = nyDateFromMs(Date.now());
  await putMeta(ctx, META_TODAY, date);
  return date;
}

export async function studentWithdrawalStatus(
  ctx: Ctx,
  student: Doc<"students">,
): Promise<WithdrawalStatus> {
  const todayNy = await readTodayNy(ctx);
  if (!student.quarter) {
    return withdrawalStatus({
      withdrawnAt: student.withdrawnAt,
      quarter: student.quarter,
      sessionDates: [],
      attendance: [],
      todayNy,
    });
  }
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_quarter", (q) => q.eq("quarter", student.quarter))
    .collect();
  const sessionDates = sessions.map((s) => s.date).sort();
  const rows = await ctx.db
    .query("attendance")
    .withIndex("by_student", (q) => q.eq("studentId", student._id))
    .collect();
  const attendance = rows
    .filter((r) => r.quarter === student.quarter)
    .map((r) => ({ date: r.date, attended: r.attended }));
  return withdrawalStatus({
    withdrawnAt: student.withdrawnAt,
    quarter: student.quarter,
    sessionDates,
    attendance,
    todayNy,
  });
}

export async function statusesForStudents(
  ctx: Ctx,
  students: Doc<"students">[],
): Promise<Map<Id<"students">, WithdrawalStatus>> {
  const todayNy = await readTodayNy(ctx);
  const quarters = [
    ...new Set(
      students
        .map((s) => s.quarter)
        .filter((q): q is string => typeof q === "string" && q.length > 0),
    ),
  ];
  const sessionDatesByQuarter = new Map<string, string[]>();
  const attendanceByStudent = new Map<
    Id<"students">,
    { date: string; attended: boolean }[]
  >();
  for (const quarter of quarters) {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_quarter", (q) => q.eq("quarter", quarter))
      .collect();
    sessionDatesByQuarter.set(
      quarter,
      sessions.map((s) => s.date).sort(),
    );
    const rows = await ctx.db
      .query("attendance")
      .withIndex("by_quarter_date", (q) => q.eq("quarter", quarter))
      .collect();
    for (const row of rows) {
      const list = attendanceByStudent.get(row.studentId) ?? [];
      list.push({ date: row.date, attended: row.attended });
      attendanceByStudent.set(row.studentId, list);
    }
  }
  const out = new Map<Id<"students">, WithdrawalStatus>();
  for (const student of students) {
    const sessionDates = student.quarter
      ? (sessionDatesByQuarter.get(student.quarter) ?? [])
      : [];
    const attendance = attendanceByStudent.get(student._id) ?? [];
    out.set(
      student._id,
      withdrawalStatus({
        withdrawnAt: student.withdrawnAt,
        quarter: student.quarter,
        sessionDates,
        attendance,
        todayNy,
      }),
    );
  }
  return out;
}

export async function filterActiveStudents(
  ctx: Ctx,
  students: Doc<"students">[],
): Promise<Doc<"students">[]> {
  if (students.length === 0) return [];
  const statuses = await statusesForStudents(ctx, students);
  return students.filter((s) => !statuses.get(s._id)!.withdrawn);
}

export function displayMissed(
  student: Doc<"students">,
  status: WithdrawalStatus,
): number {
  return quarterAppliesAbsenceRule(student.quarter)
    ? status.missedCount
    : student.missed;
}

// Shared with applyWithdrawal: drop 小組 and current-quarter 主領/觀察
// so 課堂安排 cannot show a ghost after they leave. Becoming active
// again does NOT restore the group — the instructor re-seats them.
async function openCoverageNotice(
  ctx: MutationCtx,
  groupName: string,
) {
  const rows = await ctx.db
    .query("groupCoverageNotices")
    .withIndex("by_quarter_group", (q) =>
      q.eq("quarter", CURRENT_QUARTER).eq("groupName", groupName),
    )
    .collect();
  return rows.find((r) => r.resolvedAt === undefined) ?? null;
}

// After a withdrawal removes someone from `groupName`, email instructors
// once while that group stays under 3. Recovering to 3+ (or emptying)
// resolves the notice so a later drop can notify again. Banner itself
// is derived from live counts in groupCoverage.alerts.
export async function maybeNotifyUnderstaffedGroup(
  ctx: MutationCtx,
  groupName: string | undefined,
): Promise<{ notified: boolean; memberCount: number }> {
  if (!groupName) return { notified: false, memberCount: 0 };
  const active = (
    await filterActiveStudents(ctx, await ctx.db.query("students").collect())
  ).filter((s) => s.quarter === CURRENT_QUARTER && s.groupName === groupName);
  const memberCount = active.length;
  const open = await openCoverageNotice(ctx, groupName);

  if (memberCount === 0 || memberCount >= MIN_ACTIVE_MEMBERS) {
    if (open) await ctx.db.patch(open._id, { resolvedAt: Date.now() });
    return { notified: false, memberCount };
  }

  if (open?.emailedAt !== undefined) {
    return { notified: false, memberCount };
  }
  if (!open) {
    await ctx.db.insert("groupCoverageNotices", {
      quarter: CURRENT_QUARTER,
      groupName,
      memberCount,
      createdAt: Date.now(),
    });
  } else if (open.memberCount !== memberCount) {
    await ctx.db.patch(open._id, { memberCount });
  }

  await ctx.scheduler.runAfter(0, internal.authEmail.sendCoverageEmail, {
    quarter: CURRENT_QUARTER,
    groupName,
    memberCount,
    memberNames: active.map((s) => s.name),
  });
  return { notified: true, memberCount };
}

export async function retryPendingCoverageNotices(
  ctx: MutationCtx,
): Promise<number> {
  const rows = await ctx.db.query("groupCoverageNotices").collect();
  const pending = rows.filter(
    (r) =>
      r.quarter === CURRENT_QUARTER &&
      r.resolvedAt === undefined &&
      r.emailedAt === undefined,
  );
  for (const row of pending) {
    await maybeNotifyUnderstaffedGroup(ctx, row.groupName);
  }
  return pending.length;
}

export async function clearGroupAndAssignments(
  ctx: MutationCtx,
  studentId: Id<"students">,
): Promise<{ clearedGroup: boolean; swept: number }> {
  const student = await ctx.db.get(studentId);
  const formerGroup = student?.groupName;
  let clearedGroup = false;
  if (student?.groupName) {
    await ctx.db.patch(studentId, { groupName: undefined });
    clearedGroup = true;
  }
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_quarter", (q) => q.eq("quarter", CURRENT_QUARTER))
    .collect();
  let swept = 0;
  for (const session of sessions) {
    const leaderIds = session.leaderIds.filter((id) => id !== studentId);
    const observerIds = session.observerIds.filter((id) => id !== studentId);
    if (
      leaderIds.length !== session.leaderIds.length ||
      observerIds.length !== session.observerIds.length
    ) {
      await ctx.db.patch(session._id, { leaderIds, observerIds });
      swept++;
    }
  }
  if (clearedGroup) {
    await maybeNotifyUnderstaffedGroup(ctx, formerGroup);
  }
  return { clearedGroup, swept };
}

export async function maybeApplyAbsenceWithdrawal(
  ctx: MutationCtx,
  studentId: Id<"students">,
): Promise<{ applied: boolean; clearedGroup: boolean; swept: number }> {
  await writeTodayNy(ctx);
  const student = await ctx.db.get(studentId);
  if (!student) {
    return { applied: false, clearedGroup: false, swept: 0 };
  }
  const status = await studentWithdrawalStatus(ctx, student);
  if (!status.withdrawn || status.cause !== "absences") {
    return { applied: false, clearedGroup: false, swept: 0 };
  }
  const result = await clearGroupAndAssignments(ctx, studentId);
  return { applied: true, ...result };
}

export async function canStudentRecordPresent(
  ctx: Ctx,
  student: Doc<"students">,
  date: string,
): Promise<boolean> {
  const todayNy = await readTodayNy(ctx);
  if (!student.quarter) return student.withdrawnAt === undefined;
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_quarter", (q) => q.eq("quarter", student.quarter))
    .collect();
  const sessionDates = sessions.map((s) => s.date).sort();
  const rows = await ctx.db
    .query("attendance")
    .withIndex("by_student", (q) => q.eq("studentId", student._id))
    .collect();
  return canRecordPresent({
    withdrawnAt: student.withdrawnAt,
    quarter: student.quarter,
    sessionDates,
    attendance: rows
      .filter((r) => r.quarter === student.quarter)
      .map((r) => ({ date: r.date, attended: r.attended })),
    todayNy,
    date,
  });
}

// Instructor-readable clock (the sheet default date uses this, not the
// browser's local timezone).
export const todayNy = query({
  handler: async (ctx) => readTodayNy(ctx),
});

export const refreshTodayNy = internalMutation({
  handler: async (ctx) => ({ todayNy: await writeTodayNy(ctx) }),
});

// Test pin. Production never sets this. Pass null to clear.
export const setTodayNyOverride = internalMutation({
  args: { date: v.union(v.string(), v.null()) },
  handler: async (ctx, { date }) => {
    if (date === null) await clearMeta(ctx, META_OVERRIDE);
    else await putMeta(ctx, META_OVERRIDE, date);
    return { todayNy: await readTodayNy(ctx) };
  },
});

// Hourly: write today's NY date (so queries re-run at midnight NY), then
// sweep anyone who just crossed two misses because a blank became a miss.
async function runDailySweep(ctx: MutationCtx) {
  const todayNyDate = await writeTodayNy(ctx);
  const students = await ctx.db.query("students").collect();
  const statuses = await statusesForStudents(ctx, students);
  let swept = 0;
  let clearedGroup = 0;
  for (const student of students) {
    const status = statuses.get(student._id);
    if (!status || !status.withdrawn || status.cause !== "absences") {
      continue;
    }
    const result = await clearGroupAndAssignments(ctx, student._id);
    if (result.clearedGroup || result.swept) swept++;
    if (result.clearedGroup) clearedGroup++;
  }
  const pendingCoverage = await retryPendingCoverageNotices(ctx);
  return { todayNy: todayNyDate, swept, clearedGroup, pendingCoverage };
}

export const dailySweep = internalMutation({
  handler: runDailySweep,
});

// Debug/test read: status for one email in a quarter.
export const statusForEmail = internalQuery({
  args: { email: v.string(), quarter: v.optional(v.string()) },
  handler: async (ctx, { email, quarter }) => {
    const q = quarter ?? CURRENT_QUARTER;
    const student = (
      await ctx.db
        .query("students")
        .withIndex("by_email", (x) => x.eq("email", email))
        .collect()
    ).find((s) => s.quarter === q);
    if (!student) return null;
    const status = await studentWithdrawalStatus(ctx, student);
    return {
      id: student._id,
      name: student.name,
      groupName: student.groupName ?? null,
      withdrawnAt: student.withdrawnAt ?? null,
      ...status,
    };
  },
});
