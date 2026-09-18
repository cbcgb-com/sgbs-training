import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { CURRENT_QUARTER } from "../src/constants";

// ---- Auth helpers ----

type Ctx = QueryCtx | MutationCtx;

async function requireAuth(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("請先登入");
  return identity;
}

async function isInstructor(ctx: Ctx, email: string) {
  const row = await ctx.db
    .query("instructors")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  return row !== null && row.active === true;
}

async function requireInstructor(ctx: Ctx) {
  const identity = await requireAuth(ctx);
  const email = identity.email ?? "";
  if (!(await isInstructor(ctx, email))) {
    throw new Error("僅限同工存取");
  }
  return identity;
}

// 退出報名: a student row is withdrawn while its withdrawnAt is set —
// presence is the whole state. See docs/designs/withdrawal/LLD.md.
function isWithdrawn(s: Doc<"students">): boolean {
  return s.withdrawnAt !== undefined;
}

// Sweep a student out of every current-quarter session's 主領/觀察 arrays,
// so 課堂安排 cannot show a ghost 主領/觀察 after they leave. Historical
// quarters keep their assignments as history. Returns sessions touched.
async function sweepFromSessions(
  ctx: MutationCtx,
  studentId: Id<"students">,
): Promise<number> {
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
  return swept;
}

// ---- Views: instructor-only (the full roster) ----

// Master View: everyone, including withdrawn students (soft state keeps
// history — the UI badges them 已退出). This is deliberately the one roster
// view that does not filter withdrawnAt.
export const all = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return await ctx.db.query("students").collect();
  },
});

// 本季度: active students registered for the given quarter (default:
// current). Withdrawn students are excluded.
export const byQuarter = query({
  args: { quarter: v.optional(v.string()) },
  handler: async (ctx, { quarter }) => {
    await requireInstructor(ctx);
    return (
      await ctx.db
        .query("students")
        .withIndex("by_quarter", (q) =>
          q.eq("quarter", quarter ?? CURRENT_QUARTER),
        )
        .collect()
    ).filter((s) => !isWithdrawn(s));
  },
});

// 已退出: withdrawn students for the dedicated filterable view (all
// quarters; the UI filters). Instructor-only, like every roster view.
export const withdrawn = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return (await ctx.db.query("students").collect())
      .filter(isWithdrawn)
      .map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email ?? "",
        fellowship: s.fellowship ?? "",
        groupName: s.groupName ?? "",
        quarter: s.quarter ?? "",
        withdrawnAt: s.withdrawnAt!,
        withdrawnReason: s.withdrawnReason ?? "",
        photoStorageId: s.photoStorageId,
      }));
  },
});

// 带领经验: everyone with actual leading experience (帶過…), enriched
// with the class dates they led — derived from the sessions table
// (leaderIds), the single source of assignment truth.
export const withExperience = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    const students = (await ctx.db.query("students").collect()).filter(
      (s) =>
        s.leadingExperience !== undefined &&
        s.leadingExperience !== "沒帶過",
    );
    const byId = new Map(students.map((s) => [s._id, s]));
    const dates = new Map<Id<"students">, string[]>();
    for (const session of await ctx.db.query("sessions").collect()) {
      for (const id of session.leaderIds) {
        if (!byId.has(id)) continue;
        const list = dates.get(id) ?? [];
        list.push(session.date);
        dates.set(id, list);
      }
    }
    return students.map((s) => ({
      ...s,
      leadingDates: (dates.get(s._id) ?? []).sort(),
    }));
  },
});

// 主領日期: per-student leading dates, derived from sessions.
export const leaders = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return await deriveStudentDates(ctx, "leaderIds");
  },
});

// 观察日期: per-student observing dates, derived from sessions.
export const observers = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return await deriveStudentDates(ctx, "observerIds");
  },
});

// 出勤: per-student attendance marks over a quarter's session dates.
// `marks` align with `dates` (same order); each is yes/no, or none when
// attendance was never recorded for that date.
export const quarterAttendance = query({
  args: { quarter: v.optional(v.string()) },
  handler: async (ctx, { quarter }) => {
    await requireInstructor(ctx);
    const q = quarter ?? CURRENT_QUARTER;
    const sessions = (
      await ctx.db
        .query("sessions")
        .withIndex("by_quarter", (x) => x.eq("quarter", q))
        .collect()
    ).sort((a, b) => a.date.localeCompare(b.date));
    const students = await ctx.db
      .query("students")
      .withIndex("by_quarter", (x) => x.eq("quarter", q))
      .collect();
    // Withdrawn students leave the attendance view (their attendance rows
    // are kept — history — but they are no longer a current-quarter row).
    const active = students.filter((s) => !isWithdrawn(s));
    const rows = await ctx.db
      .query("attendance")
      .withIndex("by_quarter_date", (x) => x.eq("quarter", q))
      .collect();
    const attendedAt = new Map(
      rows.map((r) => [`${r.studentId}:${r.date}`, r.attended]),
    );
    type Mark = "yes" | "no" | "none";
    return {
      quarter: q,
      dates: sessions.map((s) => s.date),
      students: active.map((s) => ({
        _id: s._id,
        name: s.name,
        fellowship: s.fellowship ?? "",
        missed: s.missed,
        marks: sessions.map((sess): Mark => {
          const a = attendedAt.get(`${s._id}:${sess.date}`);
          return a === undefined ? "none" : a ? "yes" : "no";
        }),
      })),
    };
  },
});

// ---- Attendance writes (出勤) ----

// Upsert one (student, date) attendance row and keep the replicated
// `missed` count in sync. Callers must validate that `date` is an
// active session date of `quarter` — recordAttendance does; the
// backfill migration maps positional marks against the quarter's
// calendar instead.
export async function upsertAttendance(
  ctx: MutationCtx,
  studentId: Id<"students">,
  quarter: string,
  date: string,
  attended: boolean,
): Promise<"created" | "updated" | "unchanged"> {
  const existingRows = await ctx.db
    .query("attendance")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  const existing = existingRows.find((a) => a.date === date);
  let result: "created" | "updated" | "unchanged" = "unchanged";
  if (existing) {
    if (existing.attended !== attended) {
      await ctx.db.patch(existing._id, { attended });
      result = "updated";
    }
  } else {
    await ctx.db.insert("attendance", {
      studentId,
      quarter,
      date,
      attended,
    });
    result = "created";
  }
  const missed = (
    await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()
  ).filter((a) => !a.attended).length;
  const student = await ctx.db.get(studentId);
  if (student && student.missed !== missed) {
    await ctx.db.patch(studentId, { missed });
  }
  return result;
}

// Record one attendance mark (instructors only). The class date must be
// an active session date of the student's quarter — the write is
// rejected otherwise, so attendance can never point at a non-class day.
export const recordAttendance = mutation({
  args: {
    studentId: v.id("students"),
    date: v.string(),
    attended: v.boolean(),
  },
  handler: async (ctx, { studentId, date, attended }) => {
    await requireInstructor(ctx);
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("找不到此學員");
    const quarter = student.quarter;
    if (!quarter) throw new Error("學員沒有所屬季度");
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_quarter", (q) => q.eq("quarter", quarter))
      .collect();
    if (!sessions.some((s) => s.date === date)) {
      throw new Error("此日期不是該季的上課日期");
    }
    await upsertAttendance(ctx, studentId, quarter, date, attended);
  },
});

// Kanban views: group everyone by a select field.
export const grouped = query({
  args: {
    field: v.union(
      v.literal("fellowship"),
      v.literal("baptismTime"),
      v.literal("gender"),
      v.literal("quarter"),
    ),
  },
  handler: async (ctx, { field }) => {
    await requireInstructor(ctx);
    const students = (await ctx.db.query("students").collect()).filter(
      (s) => !isWithdrawn(s),
    );
    const groups = new Map<string, typeof students>();
    for (const s of students) {
      const key = s[field] ?? "（未填）";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.entries()].map(([value, members]) => ({
      value,
      count: members.length,
      students: members,
    }));
  },
});

// Per-student leading/observing dates, inverted from the sessions table.
async function deriveStudentDates(ctx: QueryCtx, role: "leaderIds" | "observerIds") {
  const sessions = await ctx.db.query("sessions").collect();
  const students = await ctx.db.query("students").collect();
  const byId = new Map(students.map((s) => [s._id, s]));
  const dates = new Map<Id<"students">, { student: Doc<"students">; dates: string[] }>();
  for (const session of sessions) {
    for (const id of session[role]) {
      const student = byId.get(id);
      if (!student) continue;
      const entry = dates.get(id) ?? { student, dates: [] };
      entry.dates.push(session.date);
      dates.set(id, entry);
    }
  }
  return [...dates.values()].map(({ student, dates: d }) => ({
    ...student,
    dates: d,
  }));
}

// ---- Member views: any signed-in user ----

// Who am I, and what am I allowed to see?
export const me = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const email = identity.email ?? "";
    const instructor = email
      ? await ctx.db
          .query("instructors")
          .withIndex("by_email", (q) => q.eq("email", email))
          .unique()
      : null;
    const student = email
      ? (
          await ctx.db
            .query("students")
            .withIndex("by_email", (q) => q.eq("email", email))
            .collect()
        ).find((s) => s.quarter === CURRENT_QUARTER && !isWithdrawn(s))
      : undefined;
    return {
      email,
      name: identity.name ?? null,
      isInstructor: instructor?.active === true,
      student: student
        ? {
            _id: student._id,
            name: student.name,
            groupName: student.groupName ?? null,
            quarter: student.quarter ?? null,
          }
        : null,
    };
  },
});

// 聯絡表: the class contact directory (name, email, fellowship, group).
// Students see only the current season; instructors see every quarter.
// Withdrawn students are excluded for both — they have left the class.
export const directory = query({
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    const email = identity.email ?? "";
    const instructor = await isInstructor(ctx, email);
    const students = (await ctx.db.query("students").collect()).filter(
      (s) => !isWithdrawn(s),
    );
    const visible = instructor
      ? students
      : students.filter((s) => s.quarter === CURRENT_QUARTER);
    return visible
      .map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email ?? "",
        fellowship: s.fellowship ?? "",
        groupName: s.groupName ?? "",
        quarter: s.quarter ?? "",
        photoStorageId: s.photoStorageId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  },
});

// 我的組: my group mates this quarter (names + contact info).
export const myGroup = query({
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    const email = identity.email ?? "";
    const mine = (
      await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    ).find((s) => s.quarter === CURRENT_QUARTER);
    if (!mine || isWithdrawn(mine)) {
      // A withdrawn student is no longer a member of a group this quarter.
      return { registered: false, groupName: null, members: [] };
    }
    if (!mine.groupName) {
      return { registered: true, groupName: null, members: [] };
    }
    const all = await ctx.db.query("students").collect();
    const members = all
      .filter(
        (s) =>
          s.quarter === CURRENT_QUARTER &&
          s.groupName === mine.groupName &&
          !isWithdrawn(s),
      )
      .map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email ?? "",
        fellowship: s.fellowship ?? "",
        photoStorageId: s.photoStorageId,
        isMe: s._id === mine._id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
    return { registered: true, groupName: mine.groupName, members };
  },
});

// 課堂安排: each session with resolved leader/observer names.
export const schedule = query({
  handler: async (ctx) => {
    await requireAuth(ctx);
    const sessions = await ctx.db.query("sessions").collect();
    sessions.sort((a, b) => a.date.localeCompare(b.date));
    return Promise.all(
      sessions.map(async (s) => ({
        _id: s._id,
        date: s.date,
        quarter: s.quarter ?? "",
        assistantNames: s.assistantNames ?? [],
        leaders: await resolveNames(ctx, s.leaderIds),
        observers: await resolveNames(ctx, s.observerIds),
      })),
    );
  },
});

async function resolveNames(ctx: QueryCtx, ids: Id<"students">[]) {
  const out: { _id: Id<"students">; name: string }[] = [];
  for (const id of ids) {
    const s = await ctx.db.get(id);
    if (s) out.push({ _id: s._id, name: s.name });
  }
  return out;
}

// Photo storage ids -> servable URLs (signed-in users only).
export const photoUrls = query({
  handler: async (ctx) => {
    await requireAuth(ctx);
    const students = await ctx.db.query("students").collect();
    const urls: Record<string, string | null> = {};
    for (const s of students) {
      if (s.photoStorageId) {
        urls[s.photoStorageId] = await ctx.storage.getUrl(s.photoStorageId);
      }
    }
    return urls;
  },
});

// ---- Instructor-managed registration ----
//
// An active instructor registers someone else (e.g. an in-person signup)
// by email. The student row is created immediately (the instructor
// vouches for the address); the registrant signs in later by email
// lookup — same as every Airtable-era row. Self-registration by members
// goes through auth.verifyRegistrationCode (email-code proof) instead.

export const registerStudent = mutation({
  args: {
    name: v.string(),
    gender: v.string(),
    fellowship: v.string(),
    baptismTime: v.string(),
    leadingExperience: v.string(),
    confirmedAttendance: v.boolean(),
    quarter: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requireInstructor(ctx);
    const targetEmail = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      throw new Error("請填寫有效的電子郵箱");
    }
    // Instructor rule: active instructors are never students in the
    // current quarter.
    if (await isInstructor(ctx, targetEmail)) {
      throw new Error("同工不需要報名學員名單");
    }
    const targetName = args.name.trim();

    for (const [field, value] of Object.entries(args)) {
      if (
        field !== "quarter" &&
        field !== "photoStorageId" &&
        field !== "email" &&
        (value === undefined || value === "")
      ) {
        throw new Error(`缺少必填欄位：${field}`);
      }
    }
    if (!args.confirmedAttendance) {
      throw new Error("請確認您可以出席至少4堂課");
    }

    const quarter = args.quarter ?? CURRENT_QUARTER;
    const existing = await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", targetEmail))
      .collect();
    const duplicate = existing.find((s) => s.quarter === quarter);
    if (duplicate && !isWithdrawn(duplicate)) {
      return { status: "duplicate" as const, id: duplicate._id };
    }
    if (duplicate) {
      // Reactivation (退出報名): the returning student re-registers for the
      // SAME quarter — patch the row active and refresh the registration
      // fields from this submission rather than inserting a second row
      // (see docs/designs/withdrawal/LLD.md).
      if (
        args.photoStorageId &&
        duplicate.photoStorageId &&
        duplicate.photoStorageId !== args.photoStorageId
      ) {
        await ctx.storage.delete(duplicate.photoStorageId);
      }
      await ctx.db.patch(duplicate._id, {
        name: targetName,
        gender: args.gender,
        fellowship: args.fellowship,
        baptismTime: args.baptismTime,
        leadingExperience: args.leadingExperience,
        quarter,
        present: true,
        withdrawnAt: undefined,
        withdrawnReason: undefined,
        photoStorageId: args.photoStorageId ?? duplicate.photoStorageId,
      });
      // Reactivation sends the welcome email too (2026-09-17 decision):
      // the same first-contact path as a first registration.
      await ctx.scheduler.runAfter(0, internal.authEmail.sendWelcomeEmail, {
        email: targetEmail,
        name: targetName,
      });
      return { status: "reactivated" as const, id: duplicate._id };
    }

    const id = await ctx.db.insert("students", {
      name: targetName,
      gender: args.gender,
      fellowship: args.fellowship,
      email: targetEmail,
      baptismTime: args.baptismTime,
      leadingExperience: args.leadingExperience,
      quarter,
      // 出席 is true on every row (2026-09-05 cleanup).
      present: true,
      // Attendance starts unrecorded (0 misses recorded), not 5.
      missed: 0,
      photoStorageId: args.photoStorageId,
    });
    // Welcome email for in-person signups too (2026-09-06 decision):
    // the instructor vouches for the address, so no code email
    // preceded this — the welcome note IS their first contact.
    // Scheduled, not awaited: the instructor's save never blocks or
    // fails on SMTP trouble.
    await ctx.scheduler.runAfter(0, internal.authEmail.sendWelcomeEmail, {
      email: targetEmail,
      name: targetName,
    });
    return { status: "created" as const, id };
  },
});

// ---- Group assignment (instructors only) ----

// Persist a grouping produced by the one-click divider or manual overrides.
// Only current-quarter students are touched; an empty groupName clears the
// student's assignment.
export const saveGroups = mutation({
  args: {
    assignments: v.array(
      v.object({
        studentId: v.id("students"),
        groupName: v.string(),
      }),
    ),
  },
  handler: async (ctx, { assignments }) => {
    await requireInstructor(ctx);
    let updated = 0;
    for (const { studentId, groupName } of assignments) {
      const s = await ctx.db.get(studentId);
      if (!s || s.quarter !== CURRENT_QUARTER || isWithdrawn(s)) continue;
      if (s.groupName !== groupName) {
        await ctx.db.patch(
          studentId,
          groupName ? { groupName } : { groupName: undefined },
        );
      }
      updated++;
    }
    return { updated };
  },
});

// Rename a group: sweeps every current-quarter member of the old name to
// the new one.
export const renameGroup = mutation({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    await requireInstructor(ctx);
    const name = to.trim();
    if (!name) throw new Error("組名不可空白");
    if (name === from) return 0;
    const members = (await ctx.db.query("students").collect()).filter(
      (s) =>
        s.quarter === CURRENT_QUARTER &&
        s.groupName === from &&
        !isWithdrawn(s),
    );
    for (const m of members) {
      await ctx.db.patch(m._id, { groupName: name });
    }
    return members.length;
  },
});

// ---- Student self-service (own group + own schedule entries) ----

// The signed-in user's current-quarter student record. A withdrawn student
// is not a member of the class: they get the 請先註冊本季課程 path again,
// not student features (re-registration reactivates the same row).
async function requireCurrentStudent(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);
  const email = identity.email ?? "";
  const me = (
    await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()
  ).find((s) => s.quarter === CURRENT_QUARTER && !isWithdrawn(s));
  if (!me) throw new Error("請先註冊本季課程");
  return me;
}

// Students add THEMSELVES as 主領 or 觀察 for a class week. Adding one role
// removes them from the other role of the same week (one job per class).
export const addMeToSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("leader"), v.literal("observer")),
  },
  handler: async (ctx, { sessionId, role }) => {
    const me = await requireCurrentStudent(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session || session.quarter !== CURRENT_QUARTER) {
      throw new Error("找不到此課堂");
    }
    const leaderIds = session.leaderIds.filter((id) => id !== me._id);
    const observerIds = session.observerIds.filter((id) => id !== me._id);
    if (role === "leader") leaderIds.push(me._id);
    else observerIds.push(me._id);
    await ctx.db.patch(sessionId, { leaderIds, observerIds });
  },
});

// Students remove only themselves from a week's 主領/觀察.
export const removeMeFromSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("leader"), v.literal("observer")),
  },
  handler: async (ctx, { sessionId, role }) => {
    const me = await requireCurrentStudent(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("找不到此課堂");
    if (role === "leader") {
      await ctx.db.patch(sessionId, {
        leaderIds: session.leaderIds.filter((id) => id !== me._id),
      });
    } else {
      await ctx.db.patch(sessionId, {
        observerIds: session.observerIds.filter((id) => id !== me._id),
      });
    }
  },
});

// Any member of a group can rename it (applies to all members this quarter).
export const renameMyGroup = mutation({
  args: { to: v.string() },
  handler: async (ctx, { to }) => {
    const me = await requireCurrentStudent(ctx);
    const name = to.trim();
    if (!name) throw new Error("組名不可空白");
    if (name.length > 20) throw new Error("組名請控制在二十字以內");
    if (!me.groupName) throw new Error("尚未分配小組");
    if (me.groupName === name) return 0;
    const members = (await ctx.db.query("students").collect()).filter(
      (s) =>
        s.quarter === CURRENT_QUARTER &&
        s.groupName === me.groupName &&
        !isWithdrawn(s),
    );
    for (const m of members) {
      await ctx.db.patch(m._id, { groupName: name });
    }
    return members.length;
  },
});

// ---- 我的資料: student self-service profile (own row only) ----

// The signed-in student's own full registration record + a servable photo
// URL. Guests and instructors (the instructor rule keeps them out of the
// students table) get registered: false. Read model for the 我的資料 tab.
//
// A withdrawn student still resolves: `withdrawn: true` drives the 已退出
// state (with a 重新報名 path), while `registered` stays true because the
// quarter's row exists. Active students see `withdrawn: false`.
export const myProfile = query({
  handler: async (ctx) => {
    const empty = {
      registered: false,
      withdrawn: false,
      withdrawnAt: null,
      withdrawnReason: null,
      student: null,
      photoUrl: null,
    };
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return empty;
    const email = identity.email ?? "";
    const mine = (
      await ctx.db
        .query("students")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect()
    ).find((s) => s.quarter === CURRENT_QUARTER);
    if (!mine) return empty;
    return {
      registered: true,
      withdrawn: isWithdrawn(mine),
      withdrawnAt: mine.withdrawnAt ?? null,
      withdrawnReason: mine.withdrawnReason ?? null,
      student: {
        _id: mine._id,
        name: mine.name,
        email: mine.email ?? "",
        gender: mine.gender ?? "",
        fellowship: mine.fellowship ?? "",
        baptismTime: mine.baptismTime ?? "",
        leadingExperience: mine.leadingExperience ?? "",
        groupName: mine.groupName ?? null,
        quarter: mine.quarter ?? "",
        photoStorageId: mine.photoStorageId ?? null,
      },
      photoUrl: mine.photoStorageId
        ? await ctx.storage.getUrl(mine.photoStorageId)
        : null,
    };
  },
});

// Update the student's own particulars — the registration fields minus
// 郵箱 (identity-authoritative; sign-in is that email) and minus 小組/
// 季度/出勤 (instructor territory). Validation mirrors registration:
// non-empty after trimming, Chinese errors.
export const updateMyProfile = mutation({
  args: {
    name: v.string(),
    gender: v.string(),
    fellowship: v.string(),
    baptismTime: v.string(),
    leadingExperience: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireCurrentStudent(ctx);
    const trimmed = {
      name: args.name.trim(),
      gender: args.gender.trim(),
      fellowship: args.fellowship.trim(),
      baptismTime: args.baptismTime.trim(),
      leadingExperience: args.leadingExperience.trim(),
    };
    for (const [field, value] of Object.entries(trimmed)) {
      if (!value) throw new Error(`缺少必填欄位：${field}`);
    }
    await ctx.db.patch(me._id, trimmed);
  },
});

// Set or clear the student's own photo. Passing no photoStorageId removes
// the photo; replacing it deletes the previous blob so photos don't
// accumulate in storage (same cleanup as row deletion).
export const updateMyPhoto = mutation({
  args: { photoStorageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { photoStorageId }) => {
    const me = await requireCurrentStudent(ctx);
    if (me.photoStorageId && me.photoStorageId !== photoStorageId) {
      await ctx.storage.delete(me.photoStorageId);
    }
    await ctx.db.patch(me._id, { photoStorageId });
  },
});

// ---- 退出報名: soft-state withdrawal ----
//
// See docs/designs/withdrawal/LLD.md. Withdrawal never deletes: it sets
// withdrawnAt on the row, clears the group assignment, and sweeps the
// student out of the current quarter's session assignments. Attendance
// rows and `missed` stay untouched — the quarter's history is the point of
// soft state over deletion.

// Shared write: soft-state withdrawal + group clear + session sweep.
// Exported for the demo seeder so the preview path cannot drift from the
// real mutation.
export async function applyWithdrawal(
  ctx: MutationCtx,
  student: Doc<"students">,
  reason: string | undefined,
): Promise<{ status: "withdrawn" | "already"; swept: number }> {
  // Already withdrawn: no-op (never overwrite the recorded reason/date).
  // Still sweep, defensively: a malformed client could have re-added the
  // student to a session after they left.
  if (isWithdrawn(student)) {
    return { status: "already", swept: await sweepFromSessions(ctx, student._id) };
  }
  const trimmed = reason?.trim();
  await ctx.db.patch(student._id, {
    withdrawnAt: Date.now(),
    withdrawnReason: trimmed ? trimmed : undefined,
    groupName: undefined,
  });
  const swept = await sweepFromSessions(ctx, student._id);
  return { status: "withdrawn", swept };
}

// Self-service: the signed-in student leaves their quarter. Idempotent.
export const withdrawFromQuarter = mutation({
  args: { reason: v.optional(v.string()) },
  handler: async (ctx, { reason }) => {
    const me = await requireCurrentStudent(ctx);
    return await applyWithdrawal(ctx, me, reason);
  },
});

// Instructor on-behalf withdrawal (they said so in person). Not limited to
// the current quarter; the session sweep always is.
export const withdrawStudent = mutation({
  args: { studentId: v.id("students"), reason: v.optional(v.string()) },
  handler: async (ctx, { studentId, reason }) => {
    await requireInstructor(ctx);
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("找不到此學員");
    return await applyWithdrawal(ctx, student, reason);
  },
});

// Instructor undo (see LLD: a small addition beyond the issue — an
// accidental on-behalf withdrawal is otherwise unrecoverable). Clears the
// soft state; group assignment and swept sessions stay as they were.
export const reactivateStudent = mutation({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    await requireInstructor(ctx);
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("找不到此學員");
    if (!isWithdrawn(student)) return { status: "already-active" as const };
    await ctx.db.patch(studentId, {
      withdrawnAt: undefined,
      withdrawnReason: undefined,
    });
    return { status: "reactivated" as const };
  },
});

// ---- File upload (photo) ----

export const generateUploadUrl = mutation({
  handler: (ctx) => {
    // Guests may upload a registration photo before their identity
    // exists — the photo belongs to the staged registration, not to a
    // session. (Rate-limited implicitly by registration code sending.)
    return ctx.storage.generateUploadUrl();
  },
});

// ---- Session administration (instructors only) ----

export const createSession = mutation({
  args: { date: v.string(), quarter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireInstructor(ctx);
    const quarter = args.quarter ?? CURRENT_QUARTER;
    const id = await ctx.db.insert("sessions", {
      date: args.date,
      quarter,
      leaderIds: [],
      observerIds: [],
    });
    return id;
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireInstructor(ctx);
    await ctx.db.delete(sessionId);
  },
});

export const updateSessionAssignments = mutation({
  args: {
    sessionId: v.id("sessions"),
    leaderIds: v.array(v.id("students")),
    observerIds: v.array(v.id("students")),
  },
  handler: async (ctx, { sessionId, leaderIds, observerIds }) => {
    await requireInstructor(ctx);
    // A withdrawn student must never be (re-)assigned: the withdrawal sweep
    // removes them, and this is the one writer that could put them back.
    for (const id of [...leaderIds, ...observerIds]) {
      const s = await ctx.db.get(id);
      if (s && isWithdrawn(s)) {
        throw new Error(`${s.name} 已退出本季課程，無法安排主領或觀察`);
      }
    }
    await ctx.db.patch(sessionId, { leaderIds, observerIds });
  },
});

// ---- Production cleanup (CLI-only, run with npx convex run --prod) ----

// Delete one student row and its dependent attendance rows by email.
// Safe no-op when the email has no student row. Instructors table is
// intentionally untouched. Run via
//   npx convex run students:deleteStudentByEmail '{"email":"a@b.c"}'
export const deleteStudentByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const target = email.trim().toLowerCase();
    const rows = (await ctx.db.query("students").collect()).filter(
      (s) => (s.email ?? "").trim().toLowerCase() === target,
    );
    let attendanceDeleted = 0;
    for (const s of rows) {
      const att = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", s._id))
        .collect();
      for (const row of att) {
        await ctx.db.delete(row._id);
        attendanceDeleted++;
      }
      if (s.photoStorageId) {
        await ctx.storage.delete(s.photoStorageId);
      }
      await ctx.db.delete(s._id);
    }
    return { studentsDeleted: rows.length, attendanceDeleted };
  },
});

// ---- Admin cleanup (not exposed to clients) ----

export const deleteStudent = internalMutation({
  args: { id: v.id("students") },
  handler: async (ctx, { id }) => {
    const s = await ctx.db.get(id);
    if (s?.photoStorageId) {
      await ctx.storage.delete(s.photoStorageId);
    }
    await ctx.db.delete(id);
  },
});
