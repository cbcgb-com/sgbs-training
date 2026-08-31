import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { CURRENT_QUARTER } from "../src/constants";

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
// extra assignments rather than duplicated.
const FAKE_SESSIONS = [
  { date: "2026-09-13", leaderEmails: ["demo1@demo.sgbs"], observerEmails: ["demo4@demo.sgbs", "demo7@demo.sgbs"] },
  { date: "2026-09-20", leaderEmails: ["demo5@demo.sgbs", "demo2@demo.sgbs"], observerEmails: ["demo8@demo.sgbs"] },
  { date: "2026-09-27", leaderEmails: ["demo6@demo.sgbs"], observerEmails: ["demo3@demo.sgbs", "demo5@demo.sgbs"] },
  { date: "2026-10-11", leaderEmails: ["demo4@demo.sgbs", "demo7@demo.sgbs"], observerEmails: ["demo1@demo.sgbs"] },
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
        present: attended >= 4,
        class1: attended >= 1,
        class2: attended >= 2,
        class3: attended >= 3,
        class4: attended >= 4,
        class5: attended >= 5,
        missed: 5 - attended,
        homeworkSubmitted: [],
        homeworkCount: attended >= 3 ? 2 : attended,
        source: "preview-demo",
      });
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
      await ctx.db.patch(s._id, {
        groupName: undefined,
        missed: 0,
        present: undefined,
        class1: undefined,
        class2: undefined,
        class3: undefined,
        class4: undefined,
        class5: undefined,
      });
      reset++;
    }
    return { reset, names };
  },
});

// The first class of a season is orientation (課程信息介紹) — it never has
// 主領/觀察. Each season only carries four leading weeks. Run via
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
