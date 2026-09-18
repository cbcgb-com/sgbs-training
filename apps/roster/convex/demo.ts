import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { upsertAttendance, applyWithdrawal } from "./students";
import {
  CURRENT_QUARTER,
  CURRENT_QUARTER_SESSION_DATES,
} from "../src/constants";

// Preview/demo seeding: fake students, groups, and a fake 2026秋季 session
// schedule on the DEV deployment only. Run via
//   npx convex run demo:seedPreviewDemo
// Safe to re-run: students are matched by email, sessions by date.

const FAKE_STUDENTS = [
  { name: "陳大文", email: "demo1@demo.sgbs", fellowship: "樂河團契", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，多於5次", groupName: "STAR", attended: 5 },
  { name: "黃美玲", email: "demo2@demo.sgbs", fellowship: "樂河團契", gender: "女", baptismTime: "1到5年", leadingExperience: "帶過，1到5次", groupName: "STAR", attended: 4 },
  { name: "張偉明", email: "demo3@demo.sgbs", fellowship: "MIT團契（學生組）", gender: "男", baptismTime: "少於1年", leadingExperience: "沒帶過", groupName: "STAR", attended: 5 },
  { name: "劉思婷", email: "demo4@demo.sgbs", fellowship: "學生團契（研究生）", gender: "女", baptismTime: "1到5年", leadingExperience: "帶過，1到5次", groupName: "約書亞", attended: 3 },
  { name: "何俊傑", email: "demo5@demo.sgbs", fellowship: "Malden 團契", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，多於5次", groupName: "約書亞", attended: 5 },
  { name: "吳雅文", email: "demo6@demo.sgbs", fellowship: "Longwood 團契", gender: "女", baptismTime: "少於1年", leadingExperience: "沒帶過", groupName: "約書亞", attended: 4 },
  { name: "鄭曉彤", email: "demo7@demo.sgbs", fellowship: "學生團契（本科生）", gender: "女", baptismTime: "1到5年", leadingExperience: "沒帶過", groupName: "恩典", attended: 5 },
  { name: "楊日朗", email: "demo8@demo.sgbs", fellowship: "MIT團契（工作組之一）", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，1到5次", groupName: "恩典", attended: 2 },
];

// 2026秋季 Sunday schedule. Dates that already exist are patched with the
// extra assignments rather than duplicated. The first class of the season
// (2026-09-20, 課程信息介紹) is deliberately absent — orientation never
// carries 主領/觀察; only the four leading weeks appear here.
const FAKE_SESSIONS = [
  { date: "2026-09-27", leaderEmails: ["demo5@demo.sgbs", "demo2@demo.sgbs"], observerEmails: ["demo8@demo.sgbs"] },
  { date: "2026-10-04", leaderEmails: ["demo6@demo.sgbs"], observerEmails: ["demo3@demo.sgbs", "demo5@demo.sgbs"] },
  { date: "2026-10-11", leaderEmails: ["demo4@demo.sgbs", "demo7@demo.sgbs"], observerEmails: ["demo1@demo.sgbs"] },
  { date: "2026-10-18", leaderEmails: ["demo2@demo.sgbs"], observerEmails: ["demo6@demo.sgbs"] },
];

export const seedPreviewDemo = internalMutation({  handler: async (ctx) => {
    let studentsAdded = 0;
    const idByEmail = new Map<string, Id<"students">>();

    for (const s of FAKE_STUDENTS) {
      const existing = await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", s.email))
        .collect();
      const alreadyThisQuarter = existing.find(
        (e) => e.quarter === CURRENT_QUARTER,
      );
      if (alreadyThisQuarter) {
        idByEmail.set(s.email, alreadyThisQuarter._id);
        continue;
      }
      const attended = s.attended;
      const id = await ctx.db.insert("students", {
        name: s.name,
        email: s.email,
        fellowship: s.fellowship,
        gender: s.gender,
        baptismTime: s.baptismTime,
        leadingExperience: s.leadingExperience,
        groupName: s.groupName,
        quarter: CURRENT_QUARTER,
        present: true,
        missed: 0,
      });
      // Attendance: attended the first `attended` sessions, absent for
      // the rest (upsertAttendance keeps `missed` in sync).
      for (const [i, date] of CURRENT_QUARTER_SESSION_DATES.entries()) {
        await upsertAttendance(ctx, id, CURRENT_QUARTER, date, i < attended);
      }
      idByEmail.set(s.email, id);
      studentsAdded++;
    }

    // Put the earlier test registration in STAR too.
    const testStudent = await ctx.db
      .query("students")
      .withIndex("by_email", (q) =>
        q.eq("email", "sgbs-student-test@example.com"),
      )
      .collect();
    const testThisQuarter = testStudent.find(
      (s) => s.quarter === CURRENT_QUARTER,
    );
    if (testThisQuarter) {
      await ctx.db.patch(testThisQuarter._id, { groupName: "STAR" });
      idByEmail.set("sgbs-student-test@example.com", testThisQuarter._id);
    }

    let sessionsAdded = 0;
    for (const s of FAKE_SESSIONS) {
      const existing = (await ctx.db.query("sessions").collect()).find(
        (x) => x.date === s.date && x.quarter === CURRENT_QUARTER,
      );
      const leaderIds = s.leaderEmails
        .map((e) => idByEmail.get(e))
        .filter((x) => x !== undefined) as Id<"students">[];
      const observerIds = s.observerEmails
        .map((e) => idByEmail.get(e))
        .filter((x) => x !== undefined) as Id<"students">[];
      if (existing) {
        await ctx.db.patch(existing._id, {
          leaderIds: [
            ...new Set([...existing.leaderIds, ...leaderIds]),
          ],
          observerIds: [
            ...new Set([...existing.observerIds, ...observerIds]),
          ],
        });
        continue;
      }
      await ctx.db.insert("sessions", {
        date: s.date,
        quarter: CURRENT_QUARTER,
        leaderIds,
        observerIds,
      });
      sessionsAdded++;
    }

    return { studentsAdded, sessionsAdded };
  },
});

// Preview deployments get a fresh, isolated Convex backend per branch. Each
// one is seeded so a reviewer can sign in AND see a populated app
// immediately. The instructor allowlist lives in the PREVIEW_INSTRUCTORS
// preview default env var (set with
// `npx convex env default set --type preview`), NOT in this public repo —
// so real member emails are never committed. The student cohort below is
// entirely synthetic (`@demo.sgbs`, non-routable).

// Withdrawn demo students: pulled from the seeded leaders/observers and
// re-applied after the schedule is written, so the 已退出 view has rows
// while the 課堂安排 table stays populated (the withdrawal sweep removes
// only these two from current-quarter sessions).
const WITHDRAWN_DEMO = [
  { email: "demo3@demo.sgbs", reason: "時間無法配合" },
  { email: "demo7@demo.sgbs", reason: "個人因素" },
] as const;

// Shared seating logic, used by both the standalone instructor seeder and
// the full preview seeder.
async function seatInstructors(
  ctx: MutationCtx,
): Promise<{ seated: number; emails: string[]; note?: string }> {
  const raw = process.env.PREVIEW_INSTRUCTORS;
  if (!raw) {
    // No allowlist configured: nothing to seat. Return a visible warning
    // rather than throwing, so a missing env var cannot break a preview
    // deploy.
    return { seated: 0, emails: [], note: "PREVIEW_INSTRUCTORS is not set — no instructors seated" };
  }
  let parsed: Array<{ email?: unknown; name?: unknown }>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { seated: 0, emails: [], note: "PREVIEW_INSTRUCTORS is not valid JSON" };
  }
  if (!Array.isArray(parsed)) {
    return { seated: 0, emails: [], note: "PREVIEW_INSTRUCTORS must be a JSON array" };
  }

  let seated = 0;
  const emails: string[] = [];
  for (const entry of parsed) {
    if (typeof entry?.email !== "string") continue;
    const email = entry.email.trim().toLowerCase();
    if (!email) continue;
    const name = typeof entry.name === "string" ? entry.name : undefined;
    const existing = await ctx.db
      .query("instructors")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        active: true,
        ...(name !== undefined ? { name } : {}),
      });
    } else {
      await ctx.db.insert("instructors", { email, name, active: true });
    }
    emails.push(email);
    seated++;
  }
  return { seated, emails };
}

// Seat just the reviewer allowlist. Kept for ad-hoc runs:
//   npx convex run demo:seedPreviewInstructors
export const seedPreviewInstructors = internalMutation({
  handler: async (ctx) => seatInstructors(ctx),
});

// ---- Full preview dataset ----
//
// The one entry point wired into preview deploys
// (--preview-run demo:seedPreviewData). It seats the reviewers and gives
// them something to look at: a current-quarter cohort across several
// groups, an ungrouped pool for the divider, a prior-quarter cohort for
// history, the full five-Sunday calendar with 主領/觀察 assignments,
// attendance variety for the 缺課 view, and two withdrawn students so the
// 已退出 view and badge are visible.
//
// Safe to re-run: students are matched by (email, quarter), sessions by
// date, and writes go through the same helpers the app uses
// (upsertAttendance, applyWithdrawal) so preview data cannot drift from
// the real behavior.

// A prior-quarter cohort, so Master / 季度看板 / the instructor directory
// quarter filter have history to show. A quarter's active dates are its
// sessions rows, so the history quarter gets its own calendar too.
const HISTORY_QUARTER = "2026春季";
const HISTORY_SESSION_DATES = [
  "2026-02-22",
  "2026-03-01",
  "2026-03-08",
  "2026-03-15",
  "2026-03-22",
] as const;
const HISTORY_STUDENTS = [
  { name: "孫雅各", email: "hist1@demo.sgbs", fellowship: "樂河團契", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，多於5次" },
  { name: "周以諾", email: "hist2@demo.sgbs", fellowship: "學生團契（研究生）", gender: "男", baptismTime: "1到5年", leadingExperience: "帶過，1到5次" },
  { name: "林多加", email: "hist3@demo.sgbs", fellowship: "Longwood 團契", gender: "女", baptismTime: "1到5年", leadingExperience: "沒帶過" },
  { name: "黃提摩太", email: "hist4@demo.sgbs", fellowship: "MIT團契（學生組）", gender: "男", baptismTime: "少於1年", leadingExperience: "沒帶過" },
  { name: "陳路得", email: "hist5@demo.sgbs", fellowship: "Malden 團契", gender: "女", baptismTime: "超過5年", leadingExperience: "帶過，1到5次" },
  { name: "吳司提反", email: "hist6@demo.sgbs", fellowship: "其他", gender: "男", baptismTime: "1到5年", leadingExperience: "帶過，多於5次" },
];
// History-era 主領/觀察 (email lists per history date), so 主領日期 /
// 觀察日期 show real history in the roster views.
const HISTORY_SESSIONS = [
  { date: "2026-02-22", leaderEmails: ["hist1@demo.sgbs"], observerEmails: ["hist3@demo.sgbs"] },
  { date: "2026-03-01", leaderEmails: ["hist2@demo.sgbs"], observerEmails: ["hist4@demo.sgbs"] },
  { date: "2026-03-08", leaderEmails: ["hist5@demo.sgbs"], observerEmails: ["hist1@demo.sgbs"] },
  { date: "2026-03-15", leaderEmails: ["hist6@demo.sgbs"], observerEmails: ["hist2@demo.sgbs"] },
  { date: "2026-03-22", leaderEmails: ["hist1@demo.sgbs"], observerEmails: ["hist5@demo.sgbs"] },
];

export const seedPreviewData = internalMutation({
  handler: async (ctx) => {
    const seats = await seatInstructors(ctx);

    const idByEmail = new Map<string, Id<"students">>();
    let studentsAdded = 0;

    // Insert a student for a quarter unless that (email, quarter) already
    // exists; returns the id either way.
    async function ensureStudent(
      quarter: string,
      s: {
        name: string;
        email: string;
        fellowship: string;
        gender: string;
        baptismTime: string;
        leadingExperience: string;
        groupName?: string;
      },
    ): Promise<Id<"students">> {
      const existing = await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", s.email))
        .collect();
      const same = existing.find((e) => e.quarter === quarter);
      if (same) return same._id;
      const id = await ctx.db.insert("students", {
        name: s.name,
        email: s.email,
        fellowship: s.fellowship,
        gender: s.gender,
        baptismTime: s.baptismTime,
        leadingExperience: s.leadingExperience,
        quarter,
        present: true,
        missed: 0,
        ...(s.groupName ? { groupName: s.groupName } : {}),
      });
      studentsAdded++;
      return id;
    }

    // Create a quarter's session rows unless they already exist, applying
    // the date-keyed assignment plan. Returns how many were added.
    async function ensureSessions(
      quarter: string,
      dates: readonly string[],
      plan: Array<{ date: string; leaderEmails: string[]; observerEmails: string[] }>,
    ): Promise<number> {
      let added = 0;
      for (const date of dates) {
        const existing = (await ctx.db.query("sessions").collect()).find(
          (x) => x.date === date && x.quarter === quarter,
        );
        if (existing) continue;
        const week = plan.find((f) => f.date === date);
        const leaderIds = (week?.leaderEmails ?? [])
          .map((e) => idByEmail.get(e))
          .filter((x): x is Id<"students"> => x !== undefined);
        const observerIds = (week?.observerEmails ?? [])
          .map((e) => idByEmail.get(e))
          .filter((x): x is Id<"students"> => x !== undefined);
        await ctx.db.insert("sessions", {
          date,
          quarter,
          leaderIds,
          observerIds,
        });
        added++;
      }
      return added;
    }

    // 1. Current quarter: the grouped cohort, with attendance variety.
    // upsertAttendance is idempotent, so re-running simply re-asserts the
    // seeded attendance pattern (and keeps `missed` in sync).
    for (const s of FAKE_STUDENTS) {
      const id = await ensureStudent(CURRENT_QUARTER, s);
      idByEmail.set(s.email, id);
      for (const [i, date] of CURRENT_QUARTER_SESSION_DATES.entries()) {
        await upsertAttendance(ctx, id, CURRENT_QUARTER, date, i < s.attended);
      }
    }

    // 2. Current quarter: the ungrouped pool for the divider.
    for (const s of UNGROUPED_STUDENTS) {
      const id = await ensureStudent(CURRENT_QUARTER, s);
      idByEmail.set(s.email, id);
    }

    // 3. Prior quarter: students, calendar, assignments, attendance.
    for (const s of HISTORY_STUDENTS) {
      const id = await ensureStudent(HISTORY_QUARTER, s);
      idByEmail.set(s.email, id);
    }
    const historySessionsAdded = await ensureSessions(
      HISTORY_QUARTER,
      HISTORY_SESSION_DATES,
      HISTORY_SESSIONS,
    );
    for (const s of HISTORY_STUDENTS) {
      const id = idByEmail.get(s.email);
      if (!id) continue;
      for (const [i, date] of HISTORY_SESSION_DATES.entries()) {
        await upsertAttendance(ctx, id, HISTORY_QUARTER, date, i < 4);
      }
    }

    // 4. Current-quarter calendar: the full five Sundays (orientation
    //    included) with 主領/觀察 on the four leading weeks.
    const sessionsAdded = await ensureSessions(
      CURRENT_QUARTER,
      CURRENT_QUARTER_SESSION_DATES,
      FAKE_SESSIONS,
    );

    // 5. Two withdrawn students, so the 已退出 view + badge are visible.
    //    Uses the real applyWithdrawal (idempotent on re-run), which also
    //    sweeps them out of the current-quarter sessions.
    const withdrawnSummary: string[] = [];
    for (const { email, reason } of WITHDRAWN_DEMO) {
      const student = (
        await ctx.db
          .query("students")
          .withIndex("by_email", (q) => q.eq("email", email))
          .collect()
      ).find((s) => s.quarter === CURRENT_QUARTER);
      if (!student) continue;
      const res = await applyWithdrawal(ctx, student, reason);
      withdrawnSummary.push(`${email}:${res.status}`);
    }

    return {
      instructors: seats.seated,
      instructorEmails: seats.emails,
      note: seats.note,
      studentsAdded,
      sessionsAdded,
      historySessionsAdded,
      withdrawn: withdrawnSummary,
    };
  },
});

// 15 ungrouped test registrations (2026-09-05): fake students for testing
// the instructor grouping flow. No groupName — the divider starts from a
// fully unassigned pool. Run via
//   npx convex run demo:seedUngroupedStudents
// Safe to re-run: matched by email, students already registered this
// quarter are left untouched.
const UNGROUPED_STUDENTS = [
  { name: "林嘉豪", email: "demo10@demo.sgbs", fellowship: "MIT團契（工作組之一）", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，多於5次" },
  { name: "黃詩敏", email: "demo11@demo.sgbs", fellowship: "樂河團契", gender: "女", baptismTime: "1到5年", leadingExperience: "沒帶過" },
  { name: "張雅雯", email: "demo12@demo.sgbs", fellowship: "Longwood 團契", gender: "女", baptismTime: "少於1年", leadingExperience: "沒帶過" },
  { name: "李志強", email: "demo13@demo.sgbs", fellowship: "Malden 團契", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，1到5次" },
  { name: "陳美恩", email: "demo14@demo.sgbs", fellowship: "學生團契（研究生）", gender: "女", baptismTime: "1到5年", leadingExperience: "帶過，1到5次" },
  { name: "周天樂", email: "demo15@demo.sgbs", fellowship: "學生團契（本科生）", gender: "男", baptismTime: "少於1年", leadingExperience: "沒帶過" },
  { name: "許文靜", email: "demo16@demo.sgbs", fellowship: "MIT團契（學生組）", gender: "女", baptismTime: "1到5年", leadingExperience: "沒帶過" },
  { name: "王守信", email: "demo17@demo.sgbs", fellowship: "樂河團契", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，多於5次" },
  { name: "葉恩慈", email: "demo18@demo.sgbs", fellowship: "其他", gender: "女", baptismTime: "少於1年", leadingExperience: "沒帶過" },
  { name: "蔡明軒", email: "demo19@demo.sgbs", fellowship: "Longwood 團契", gender: "男", baptismTime: "1到5年", leadingExperience: "帶過，1到5次" },
  { name: "羅以琳", email: "demo20@demo.sgbs", fellowship: "Malden 團契", gender: "女", baptismTime: "超過5年", leadingExperience: "沒帶過" },
  { name: "楊約翰", email: "demo21@demo.sgbs", fellowship: "MIT團契（工作組之一）", gender: "男", baptismTime: "1到5年", leadingExperience: "帶過，多於5次" },
  { name: "許佳音", email: "demo22@demo.sgbs", fellowship: "學生團契（研究生）", gender: "女", baptismTime: "少於1年", leadingExperience: "沒帶過" },
  { name: "馮保羅", email: "demo23@demo.sgbs", fellowship: "其他", gender: "男", baptismTime: "超過5年", leadingExperience: "帶過，1到5次" },
  { name: "鄧曉琳", email: "demo24@demo.sgbs", fellowship: "樂河團契", gender: "女", baptismTime: "1到5年", leadingExperience: "帶過，1到5次" },
];

export const seedUngroupedStudents = internalMutation({
  handler: async (ctx) => {
    let added = 0;
    const skipped: string[] = [];
    for (const s of UNGROUPED_STUDENTS) {
      const existing = await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", s.email))
        .collect();
      if (existing.find((e) => e.quarter === CURRENT_QUARTER)) {
        skipped.push(s.name);
        continue;
      }
      await ctx.db.insert("students", {
        name: s.name,
        email: s.email,
        fellowship: s.fellowship,
        gender: s.gender,
        baptismTime: s.baptismTime,
        leadingExperience: s.leadingExperience,
        quarter: CURRENT_QUARTER,
        present: true,
        missed: 0,
        // No groupName: the instructor assigns groups later.
      });
      added++;
    }
    return { added, skipped };
  },
});

// Demo reset (Eric, 2026-08-30): keep the current-quarter people, strip all
// group assignments and attendance data so the group divider starts clean.
// Run via `npx convex run demo:resetQuarterData '{}'`.
export const resetQuarterData = internalMutation({
  handler: async (ctx) => {
    const students = await ctx.db.query("students").collect();
    let reset = 0;
    const names: string[] = [];
    for (const s of students) {
      if (s.quarter !== CURRENT_QUARTER) continue;
      names.push(s.name);
      const attendanceRows = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", s._id))
        .collect();
      for (const row of attendanceRows) {
        await ctx.db.delete(row._id);
      }
      await ctx.db.patch(s._id, { groupName: undefined, missed: 0 });
      reset++;
    }
    return { reset, names };
  },
});

// Wipe all 主領/觀察 assignments from the current quarter's sessions so
// the schedule starts blank (orientation week stays an empty row). Run
// via `npx convex run demo:clearSessionAssignments '{}'`.
export const clearSessionAssignments = internalMutation({
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_quarter", (q) => q.eq("quarter", CURRENT_QUARTER))
      .collect();
    let cleared = 0;
    for (const s of sessions) {
      if (s.leaderIds.length > 0 || s.observerIds.length > 0) {
        await ctx.db.patch(s._id, { leaderIds: [], observerIds: [] });
        cleared++;
      }
    }
    return { cleared, total: sessions.length };
  },
});

// The first class of a season is orientation (課程信息介紹) — it never has
// 主領/觀察. Ensure its session row exists (empty assignments) so the
// schedule shows the full five-Sunday calendar. Run via
//   npx convex run demo:ensureOrientationSession
export const ensureOrientationSession = internalMutation({
  handler: async (ctx) => {
    const date = CURRENT_QUARTER_SESSION_DATES[0];
    const existing = (await ctx.db.query("sessions").collect()).find(
      (x) => x.date === date && x.quarter === CURRENT_QUARTER,
    );
    if (existing) return { status: "exists" as const };
    await ctx.db.insert("sessions", {
      date,
      quarter: CURRENT_QUARTER,
      leaderIds: [],
      observerIds: [],
    });
    return { status: "created" as const };
  },
});

// One-off cleanup: delete a session row by date (e.g. a mis-seeded
// orientation assignment). Run via
// `npx convex run demo:deleteSessionByDate '{"date":"2026-09-13"}'`.
export const deleteSessionByDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const sessions = await ctx.db.query("sessions").collect();
    const targets = sessions.filter((s) => s.date === date);
    for (const s of targets) {
      await ctx.db.delete(s._id);
    }
    return { deleted: targets.length };
  },
});

// Preview-only: withdraw one demo student (退出報名 walkthrough) so the
// 已退出 view and the 已退出 badge have something to show. Runs the real
// applyWithdrawal (soft state + group clear + current-quarter sweep), so
// the preview path cannot drift from the mutation. Run via
//   npx convex run demo:withdrawDemoStudent
// Safe to re-run: an already-withdrawn row is a no-op (the original reason
// and date are preserved), matching the mutation.
export const withdrawDemoStudent = internalMutation({
  handler: async (ctx) => {
    const email = "demo3@demo.sgbs";
    const student = (
      await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    ).find((s) => s.quarter === CURRENT_QUARTER);
    if (!student) return { status: "not-found" as const };
    const res = await applyWithdrawal(ctx, student, "時間無法配合");
    return { status: res.status, swept: res.swept };
  },
});
