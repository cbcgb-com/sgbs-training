import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// 学员名单 (tblty4DoMC2Pmfrw6), migrated from Airtable base
// appPjFf1hVqSChSyo (小组查经训练主日学). Convex requires ASCII field
// names, so documents use English keys; the UI keeps Chinese labels.
export default defineSchema({
  students: defineTable({
    airtableId: v.optional(v.string()),
    name: v.string(),
    fellowship: v.optional(v.string()),
    email: v.optional(v.string()),
    baptismTime: v.optional(v.string()),
    quarter: v.optional(v.string()),
    groupName: v.optional(v.string()),
    gender: v.optional(v.string()),
    leadingExperience: v.optional(v.string()),
    // 出席 is true on every row (2026-09-05 cleanup).
    present: v.optional(v.boolean()),
    // Replicated count: this row's attendance rows marked absent —
    // maintained at write time by recordAttendance / the backfill
    // migration (successor of the Airtable Missed formula).
    missed: v.number(),
    // Optional registration photo (front-camera snap or gallery pick).
    photoStorageId: v.optional(v.id("_storage")),
    // 退出報名: set (ms) when the student withdraws from their quarter.
    // Presence = withdrawn; cleared (undefined) when re-activated. Mirrors
    // the instructors.active precedent — kept for history, no access.
    // See docs/designs/withdrawal/LLD.md.
    withdrawnAt: v.optional(v.number()),
    // Optional reason captured at withdrawal (dropdown or free text).
    withdrawnReason: v.optional(v.string()),
  })
    .index("by_quarter", ["quarter"])
    .index("by_email", ["email"])
    .index("by_airtableId", ["airtableId"]),

  // 课程日期 (tblQgLBaK0KENUuwT): one class session with its leading and
  // observing assignments. The session row is the source of truth; the
  // per-student views derive from these arrays. A quarter is "active"
  // on exactly the dates listed here. From 2026秋季 the season is five
  // lessons (two misses = withdrawn); older quarters are historical and
  // may have 4–6 dates. Gaps are allowed.
  // Quarters whose dates Airtable never recorded were synthesized by
  // migrations:backfillAttendance and carry estimated: true (first five
  // Sundays of April/October). Correct any wrong date in place; the
  // attendance rows follow the (quarter, date) pair, not the estimate.
  sessions: defineTable({
    date: v.string(),
    quarter: v.optional(v.string()),
    airtableId: v.optional(v.string()),
    leaderIds: v.array(v.id("students")),
    observerIds: v.array(v.id("students")),
    // Legacy assistant-teacher display names (Airtable 助教 → 教师 table,
    // which is not imported into Convex).
    assistantNames: v.optional(v.array(v.string())),
    // Temp fields used while wiring Airtable record ids to Convex ids;
    // removed by the migrations:wireSessionAssignments migration.
    leaderAirtableIds: v.optional(v.array(v.string())),
    observerAirtableIds: v.optional(v.array(v.string())),
    // True for synthesized calendar rows (Airtable lacked the dates).
    estimated: v.optional(v.boolean()),
  }).index("by_quarter", ["quarter"]),

  // 出勤記錄: one row per (student, class date) — a student's attendance
  // for a specific session of their quarter. Writes go through
  // recordAttendance, which validates that `date` is an active session
  // date of the student's quarter. A missing row means "not recorded";
  // attended=false means the student was absent.
  attendance: defineTable({
    studentId: v.id("students"),
    quarter: v.string(),
    date: v.string(),
    attended: v.boolean(),
  })
    .index("by_student", ["studentId"])
    .index("by_quarter_date", ["quarter", "date"]),

  // 功課記錄: one row per (student, session date, homework type) —
  // parallel to attendance. A missing row means "not recorded" (never
  // conflated with "not done"). Two homework types: "notes" (查經筆記,
  // one page per student in the weekly shared doc) and "questions"
  // (查經題目, one page per group, credited to that session's 主領 and
  // 觀察). Written by the agent workflow (see
  // docs/designs/homework/LLD.md), not by hand — the mutation is
  // internal, so only `npx convex run homework:recordHomework` can call
  // it; instructors read the marks in 課堂安排 按週次.
  homework: defineTable({
    studentId: v.id("students"),
    quarter: v.string(),
    date: v.string(), // the class date this homework is for
    type: v.union(v.literal("notes"), v.literal("questions")),
    done: v.boolean(), // binary, like attendance.attended
    sourceDocUrl: v.optional(v.string()), // Google Doc the record came from
    recordedAt: v.number(), // ms, refreshed on each agent write
  })
    .index("by_student", ["studentId"])
    .index("by_quarter_date", ["quarter", "date"]),

  // 同工 / instructors: emails allowed to see and edit everything.
  // active=false rows are kept for history but have no access.
  // The instructor rule: active instructors are never students in the
  // current quarter (enforced at registration and by the backfill
  // migration).
  instructors: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
  }).index("by_email", ["email"]),

  // 註冊驗證碼: one-time registration email-verification codes.
  authCodes: defineTable({
    email: v.string(),
    code: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // 登入作業階段: issued session tokens (audit + revocation). The JWT
  // itself is stateless; this table lets sign-out kill a copied token.
  authSessions: defineTable({
    jti: v.string(),
    email: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_jti", ["jti"])
    .index("by_email", ["email"]),

  // Single-row-per-key app calendar. Queries read `todayNy` instead of
  // Date.now() so a midnight America/New_York rollover re-runs derived
  // withdrawal. The hourly cron writes it; tests may set `todayNyOverride`.
  // See convex/attendanceStatus.ts and docs/designs/withdrawal/LLD.md.
  appMeta: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // One open row per (quarter, groupName) while that group is under 3
  // active members after a withdrawal. Dedupes instructor email. Banner
  // is derived from live counts, not this table. See
  // docs/designs/group-coverage/LLD.md.
  groupCoverageNotices: defineTable({
    quarter: v.string(),
    groupName: v.string(),
    memberCount: v.number(),
    createdAt: v.number(),
    emailedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  }).index("by_quarter_group", ["quarter", "groupName"]),

  // Members who arrived in a group via an instructor-confirmed merge.
  // 課堂安排 shows an observe-twice hint (not a hard block).
  groupLateJoiners: defineTable({
    studentId: v.id("students"),
    quarter: v.string(),
    groupName: v.string(),
    joinedAt: v.number(),
    sourceGroup: v.optional(v.string()),
  })
    .index("by_quarter_student", ["quarter", "studentId"])
    .index("by_quarter_group", ["quarter", "groupName"]),

  // 小組查經帶領訓練反思: one row per (student, quarter). The four
  // free-text fields are the original Google Form questions (no
  // ratings). Optional source / sourceResponseKey mark rows imported
  // from the historical Google Form (absent = written in-app). See
  // docs/designs/feedback/LLD.md.
  feedback: defineTable({
    studentId: v.id("students"),
    quarter: v.string(),
    newPractice: v.string(),
    leadingFocus: v.string(),
    courseImprovements: v.string(),
    encouragement: v.string(),
    submittedAt: v.number(),
    updatedAt: v.number(),
    source: v.optional(v.literal("googleForm")),
    sourceResponseKey: v.optional(v.string()),
  })
    .index("by_quarter", ["quarter"])
    .index("by_student", ["studentId"])
    .index("by_student_quarter", ["studentId", "quarter"])
    .index("by_sourceResponseKey", ["sourceResponseKey"]),
});
