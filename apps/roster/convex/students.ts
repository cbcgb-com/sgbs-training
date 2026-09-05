import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
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

// ---- Views: instructor-only (the full roster) ----

// Master View: everyone.
export const all = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return await ctx.db.query("students").collect();
  },
});

// 本季度: students registered for the given quarter (default: current).
export const byQuarter = query({
  args: { quarter: v.optional(v.string()) },
  handler: async (ctx, { quarter }) => {
    await requireInstructor(ctx);
    return await ctx.db
      .query("students")
      .withIndex("by_quarter", (q) =>
        q.eq("quarter", quarter ?? CURRENT_QUARTER),
      )
      .collect();
  },
});

// 带领经验: everyone with actual leading experience (帶過…).
export const withExperience = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return (await ctx.db.query("students").collect()).filter(
      (s) =>
        s.leadingExperience !== undefined &&
        s.leadingExperience !== "沒帶過",
    );
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

// Missed: students who missed at least one class.
export const withMissed = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    return (await ctx.db.query("students").collect()).filter(
      (s) => s.missed > 0,
    );
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
    const students = await ctx.db.query("students").collect();
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
        ).find((s) => s.quarter === CURRENT_QUARTER)
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
export const directory = query({
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    const email = identity.email ?? "";
    const instructor = await isInstructor(ctx, email);
    const students = await ctx.db.query("students").collect();
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
    if (!mine) return { registered: false, groupName: null, members: [] };
    if (!mine.groupName) {
      return { registered: true, groupName: null, members: [] };
    }
    const all = await ctx.db.query("students").collect();
    const members = all
      .filter(
        (s) => s.quarter === CURRENT_QUARTER && s.groupName === mine.groupName,
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
    if (duplicate) {
      return { status: "duplicate" as const, id: duplicate._id };
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
      // Airtable-era rows carry createdTime from the dump; new rows
      // stamp it here (ISO-8601, same format).
      createdTime: new Date().toISOString(),
      photoStorageId: args.photoStorageId,
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
      if (!s || s.quarter !== CURRENT_QUARTER) continue;
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
      (s) => s.quarter === CURRENT_QUARTER && s.groupName === from,
    );
    for (const m of members) {
      await ctx.db.patch(m._id, { groupName: name });
    }
    return members.length;
  },
});

// ---- Student self-service (own group + own schedule entries) ----

// The signed-in user's current-quarter student record.
async function requireCurrentStudent(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);
  const email = identity.email ?? "";
  const me = (
    await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()
  ).find((s) => s.quarter === CURRENT_QUARTER);
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
      (s) => s.quarter === CURRENT_QUARTER && s.groupName === me.groupName,
    );
    for (const m of members) {
      await ctx.db.patch(m._id, { groupName: name });
    }
    return members.length;
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
    await ctx.db.patch(sessionId, { leaderIds, observerIds });
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
