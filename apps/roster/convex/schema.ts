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
    // Legacy per-student assignment history (Airtable 主领日期/观察日期
    // links plus the older scalar 带领日期/观察的日期, harmonized into
    // these arrays by migrations:cleanupStudentFields). Assignment truth
    // now lives on the sessions table.
    leadingSessions: v.optional(v.array(v.string())),
    observingSessions: v.optional(v.array(v.string())),
    // Optional registration photo (front-camera snap or gallery pick).
    photoStorageId: v.optional(v.id("_storage")),
  })
    .index("by_quarter", ["quarter"])
    .index("by_email", ["email"])
    .index("by_airtableId", ["airtableId"]),

  // 课程日期 (tblQgLBaK0KENUuwT): one class session with its leading and
  // observing assignments. The session row is the source of truth; the
  // per-student views derive from these arrays. A quarter is "active"
  // on exactly the dates listed here — 4-6 variable weeks, gaps allowed.
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
});
