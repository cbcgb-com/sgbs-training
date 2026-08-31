import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// 学员名单 (tblty4DoMC2Pmfrw6), migrated from Airtable base
// appPjFf1hVqSChSyo (小组查经训练主日学). Convex requires ASCII field
// names, so documents use English keys; the UI keeps Chinese labels.
export default defineSchema({
  students: defineTable({
    airtableId: v.optional(v.string()),
    createdTime: v.optional(v.string()),
    name: v.string(),
    fellowship: v.optional(v.string()),
    email: v.optional(v.string()),
    baptismTime: v.optional(v.string()),
    quarter: v.optional(v.string()),
    groupName: v.optional(v.string()),
    gender: v.optional(v.string()),
    leadingExperience: v.optional(v.string()),
    present: v.optional(v.boolean()),
    class1: v.optional(v.boolean()),
    class2: v.optional(v.boolean()),
    class3: v.optional(v.boolean()),
    class4: v.optional(v.boolean()),
    class5: v.optional(v.boolean()),
    // Replicated Airtable formula: number of unchecked classes (1-5).
    missed: v.number(),
    // Legacy Airtable per-student assignment fields. Assignments now live
    // on the sessions table; these remain only for migrated history.
    leadingSessions: v.optional(v.array(v.string())),
    observingSessions: v.optional(v.array(v.string())),
    leadingDate: v.optional(v.string()),
    observingDate: v.optional(v.string()),
    // Resolved display values (was multipleRecordLinks).
    homeworkSubmitted: v.array(v.string()),
    // Legacy from Airtable 助教 links; kept for history.
    teachingAssistants: v.optional(v.array(v.string())),
    bookOrder: v.optional(v.string()),
    // Replicated Airtable count field.
    homeworkCount: v.number(),
    // Optional registration photo (front-camera snap or gallery pick).
    photoStorageId: v.optional(v.id("_storage")),
    // Clerk user id (subject) set when a signed-in user registers.
    clerkId: v.optional(v.string()),
    // "airtable" for migrated records, "form" for new registrations.
    source: v.optional(v.string()),
  })
    .index("by_quarter", ["quarter"])
    .index("by_email", ["email"])
    .index("by_airtableId", ["airtableId"]),

  // 课程日期 (tblQgLBaK0KENUuwT): one class session with its leading and
  // observing assignments. The session row is the source of truth; the
  // per-student views derive from these arrays.
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
  }).index("by_quarter", ["quarter"]),

  // 同工 / instructors: emails allowed to see and edit everything.
  // active=false rows are kept for history but have no access.
  instructors: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
  }).index("by_email", ["email"]),
});
