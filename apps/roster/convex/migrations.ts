import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { upsertAttendance } from "./students";
import {
  CURRENT_QUARTER,
  CURRENT_QUARTER_SESSION_DATES,
} from "../src/constants";

// One-time cleanup (2026-08-31): remove the legacy `clerkId` field from
// student rows after dropping the column from the schema. Identity is
// now the email itself (docs/designs/authentication/LLD.md). Safe to
// re-run — it no-ops when nothing matches.
// Run via: npx convex run migrations:dropLegacyClerkIds
export const dropLegacyClerkIds = internalMutation({
  handler: async (ctx) => {
    let removed = 0;
    let seen = 0;
    // Cast needed: the field is deliberately absent from the schema, but
    // legacy documents still carry it until this migration strips it.
    for (const s of await ctx.db.query("students").collect()) {
      seen++;
      if ((s as { clerkId?: string }).clerkId !== undefined) {
        await ctx.db.patch(
          s._id,
          { clerkId: undefined } as unknown as Partial<Doc<"students">>,
        );
        removed++;
      }
    }
    return { seen, removed };
  },
});

// One-time cleanup (2026-09-05) accompanying the schema slim-down:
// 1. Strip the fields dropped from the schema: the homework columns
//    (homeworkSubmitted/homeworkCount), the scalar date fields, the
//    provenance `source`, the legacy `teachingAssistants` links, and
//    the never-filled `bookOrder`.
// 2. Set `present` to true on every row.
// 3. Strip any leftover `createdTime` field — it was superseded by the
//    system `_creationTime`, which the export→transform→import
//    round-trip backfilled with the true creation dates (see README,
//    "Migration pipeline").
// (The legacy class1-5 marks moved to the attendance table — see
// migrations:backfillAttendance.)
// Safe to re-run — every pass no-ops when nothing matches. Run via:
//   npx convex run migrations:cleanupStudentFields [--prod]
export const cleanupStudentFields = internalMutation({
  handler: async (ctx) => {
    let seen = 0;
    let stripped = 0;
    let presentSet = 0;
    let createdStripped = 0;
    for (const s of await ctx.db.query("students").collect()) {
      seen++;
      // Cast needed: these fields are deliberately absent from the
      // schema, but legacy documents still carry them until this
      // migration strips them (same pattern as dropLegacyClerkIds).
      const legacy = s as {
        leadingDate?: string;
        observingDate?: string;
        homeworkSubmitted?: string[];
        homeworkCount?: number;
        source?: string;
        teachingAssistants?: string[];
        bookOrder?: string;
        createdTime?: string;
      };
      const patch: Record<string, unknown> = {};

      // Unset the fields removed from the schema.
      if (
        legacy.leadingDate !== undefined ||
        legacy.observingDate !== undefined ||
        legacy.homeworkSubmitted !== undefined ||
        legacy.homeworkCount !== undefined ||
        legacy.source !== undefined ||
        legacy.teachingAssistants !== undefined ||
        legacy.bookOrder !== undefined
      ) {
        patch.leadingDate = undefined;
        patch.observingDate = undefined;
        patch.homeworkSubmitted = undefined;
        patch.homeworkCount = undefined;
        patch.source = undefined;
        patch.teachingAssistants = undefined;
        patch.bookOrder = undefined;
        stripped++;
      }

      // 出席: true on every row.
      if (s.present !== true) {
        patch.present = true;
        presentSet++;
      }

      // createdTime is superseded by the true system _creationTime.
      if (legacy.createdTime !== undefined) {
        patch.createdTime = undefined;
        createdStripped++;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(
          s._id,
          patch as unknown as Partial<Doc<"students">>,
        );
      }
    }
    return {
      seen,
      stripped,
      presentSet,
      createdStripped,
    };
  },
});

// Data audit (2026-09-05, from the creation-time spike): verifies
// student/session integrity after the re-imports and that no legacy
// `createdTime` field remains. Run via:
//   npx convex run migrations:verifyStudents [--prod]
export const verifyStudents = internalQuery({
  handler: async (ctx) => {
    const students = await ctx.db.query("students").collect();
    const sessions = await ctx.db.query("sessions").collect();
    const ids = new Set(students.map((s) => s._id));
    let danglingSessionRefs = 0;
    for (const s of sessions) {
      for (const id of [...s.leaderIds, ...s.observerIds]) {
        if (!ids.has(id)) danglingSessionRefs++;
      }
    }
    const withLegacyCreatedTime = students.filter(
      (s) => (s as { createdTime?: string }).createdTime !== undefined,
    ).length;
    const withLegacyClassMarks = students.filter(
      (s) => (s as { class1?: boolean }).class1 !== undefined,
    ).length;
    const attendance = await ctx.db.query("attendance").collect();
    const seenDates = new Set<string>();
    let duplicateSessionDates = 0;
    for (const sess of sessions) {
      const key = `${sess.quarter}:${sess.date}`;
      if (seenDates.has(key)) duplicateSessionDates++;
      seenDates.add(key);
    }
    const times = students.map((s) => s._creationTime);
    return {
      count: students.length,
      sessions: sessions.length,
      danglingSessionRefs,
      withLegacyCreatedTime,
      withLegacyClassMarks,
      attendanceRows: attendance.length,
      attendanceAbsent: attendance.filter((a) => !a.attended).length,
      estimatedSessions: sessions.filter((s) => s.estimated === true).length,
      duplicateSessionDates,
      assignmentWires: sessions.reduce(
        (n, s) => n + s.leaderIds.length + s.observerIds.length,
        0,
      ),
      creationYearRange: students.length
        ? [
            new Date(Math.min(...times)).getUTCFullYear(),
            new Date(Math.max(...times)).getUTCFullYear(),
          ]
        : [],
    };
  },
});

// First Sunday of a month (UTC), then the following four Sundays.
function sundaysOf(quarter: string): string[] {
  const m = /^(20\d{2})\s*(春季|秋季)$/.exec(quarter);
  if (!m) return [];
  const year = Number(m[1]);
  const month = m[2] === "春季" ? 4 : 10;
  const first = new Date(Date.UTC(year, month - 1, 1));
  first.setUTCDate(first.getUTCDate() + ((7 - first.getUTCDay()) % 7));
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    out.push(first.toISOString().slice(0, 10));
    first.setUTCDate(first.getUTCDate() + 7);
  }
  return out;
}

// One-time attendance backfill (2026-09-05) introducing the attendance
// table:
// 1. Enforce the instructor rule: active instructors are never students
//    in the current quarter — their current-quarter rows are deleted.
// 2. Normalize session quarter "2020春季" to the canonical "2020 春季".
// 3. Dedupe session rows sharing (quarter, date), merging assignments
//    into the oldest row (2019春季 had duplicates).
// 4. Ensure the current quarter's five class dates exist.
// 5. Synthesize calendars for quarters that have students but no
//    session rows — Airtable's 课程日期 never recorded them. Dates are
//    the first five Sundays of April/October, flagged estimated: true;
//    correct any wrong date in place.
// 6. Backfill attendance from the legacy positional class1-5 marks
//    (Nth mark → Nth session date of the quarter), then strip the
//    legacy fields.
// Idempotent — every step no-ops once applied. Run via:
//   npx convex run migrations:backfillAttendance [--prod]
export const backfillAttendance = internalMutation({
  handler: async (ctx) => {
    const report = {
      instructorRowsDeleted: [] as string[],
      quartersNormalized: 0,
      sessionsDeduped: 0,
      sessionsEnsured: 0,
      quartersSynthesized: [] as string[],
      studentsSeen: 0,
      studentsStripped: 0,
      attendanceCreated: 0,
    };

    // 1. Instructors are never students in the current quarter.
    const instructors = await ctx.db.query("instructors").collect();
    const activeEmails = new Set(
      instructors.filter((i) => i.active === true).map((i) => i.email),
    );
    for (const s of await ctx.db.query("students").collect()) {
      if (
        s.quarter === CURRENT_QUARTER &&
        s.email &&
        activeEmails.has(s.email)
      ) {
        if (s.photoStorageId) await ctx.storage.delete(s.photoStorageId);
        await ctx.db.delete(s._id);
        report.instructorRowsDeleted.push(s.name);
      }
    }

    // 2. Canonical quarter name for sessions (QUARTERS has the space).
    for (const sess of await ctx.db.query("sessions").collect()) {
      if (sess.quarter === "2020春季") {
        await ctx.db.patch(sess._id, { quarter: "2020 春季" });
        report.quartersNormalized++;
      }
    }

    // 3. Dedupe (quarter, date) sessions, merging assignments.
    const seen = new Map<string, Id<"sessions">>();
    const allSessions = (await ctx.db.query("sessions").collect()).sort(
      (a, b) => a._creationTime - b._creationTime,
    );
    for (const sess of allSessions) {
      const key = `${sess.quarter}:${sess.date}`;
      const keeperId = seen.get(key);
      if (keeperId === undefined) {
        seen.set(key, sess._id);
        continue;
      }
      const keeper = await ctx.db.get(keeperId);
      if (keeper) {
        await ctx.db.patch(keeper._id, {
          leaderIds: [...new Set([...keeper.leaderIds, ...sess.leaderIds])],
          observerIds: [
            ...new Set([...keeper.observerIds, ...sess.observerIds]),
          ],
        });
      }
      await ctx.db.delete(sess._id);
      report.sessionsDeduped++;
    }

    // 4. Ensure the current quarter's five class dates.
    const currentDateSet = new Set(
      (await ctx.db.query("sessions").collect())
        .filter((s) => s.quarter === CURRENT_QUARTER)
        .map((s) => s.date),
    );
    for (const date of CURRENT_QUARTER_SESSION_DATES) {
      if (!currentDateSet.has(date)) {
        await ctx.db.insert("sessions", {
          date,
          quarter: CURRENT_QUARTER,
          leaderIds: [],
          observerIds: [],
        });
        report.sessionsEnsured++;
      }
    }

    // 5. Synthesize calendars for student-bearing quarters without one.
    const students = await ctx.db.query("students").collect();
    const quartersWithSessions = new Set(
      (await ctx.db.query("sessions").collect()).map((s) => s.quarter),
    );
    const quartersWithStudents = new Set(
      students
        .map((s) => s.quarter)
        .filter((q): q is string => q !== undefined),
    );
    for (const q of quartersWithStudents) {
      if (quartersWithSessions.has(q)) continue;
      for (const date of sundaysOf(q)) {
        await ctx.db.insert("sessions", {
          date,
          quarter: q,
          leaderIds: [],
          observerIds: [],
          estimated: true,
        });
      }
      report.quartersSynthesized.push(q);
    }

    // 6. Legacy positional marks → attendance rows.
    for (const s of students) {
      report.studentsSeen++;
      if (!s.quarter) continue;
      const legacy = s as {
        class1?: boolean;
        class2?: boolean;
        class3?: boolean;
        class4?: boolean;
        class5?: boolean;
      };
      const marks = [
        legacy.class1,
        legacy.class2,
        legacy.class3,
        legacy.class4,
        legacy.class5,
      ];
      if (marks.every((m) => m === undefined)) continue;
      const quarterSessions = (
        await ctx.db
          .query("sessions")
          .withIndex("by_quarter", (q) => q.eq("quarter", s.quarter))
          .collect()
      ).sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < marks.length; i++) {
        const mark = marks[i];
        const sess = quarterSessions[i];
        if (mark === undefined || sess === undefined) continue;
        const result = await upsertAttendance(
          ctx,
          s._id,
          s.quarter,
          sess.date,
          mark,
        );
        if (result === "created") report.attendanceCreated++;
      }
      await ctx.db.patch(s._id, {
        class1: undefined,
        class2: undefined,
        class3: undefined,
        class4: undefined,
        class5: undefined,
      } as unknown as Partial<Doc<"students">>);
      report.studentsStripped++;
    }
    return report;
  },
});

// One-time legacy-absence backfill (2026-09-05): Airtable stored
// unchecked 課堂 boxes by omission, and the first attendance backfill
// only recorded the checked (attended) classes — so past-season gaps
// stayed "unrecorded". In Airtable's own semantics (the Missed
// formula counted unchecked as missed) those gaps meant absent, so
// this pass records every remaining (student, session date) pair of a
// PAST quarter as an explicit absence. The current quarter is
// untouched: its classes haven't happened, so unrecorded stays
// unrecorded there until marked.
// Idempotent — every gap already recorded no-ops. Run via:
//   npx convex run migrations:backfillLegacyAbsences [--prod]
export const backfillLegacyAbsences = internalMutation({
  handler: async (ctx) => {
    let students = 0;
    let absencesCreated = 0;
    for (const s of await ctx.db.query("students").collect()) {
      if (!s.quarter || s.quarter === CURRENT_QUARTER) continue;
      const sessions = (
        await ctx.db
          .query("sessions")
          .withIndex("by_quarter", (q) => q.eq("quarter", s.quarter))
          .collect()
      ).sort((a, b) => a.date.localeCompare(b.date));
      if (sessions.length === 0) continue;
      students++;
      const recorded = new Set(
        (
          await ctx.db
            .query("attendance")
            .withIndex("by_student", (q) => q.eq("studentId", s._id))
            .collect()
        ).map((r) => r.date),
      );
      for (const sess of sessions) {
        if (recorded.has(sess.date)) continue;
        const result = await upsertAttendance(
          ctx,
          s._id,
          s.quarter,
          sess.date,
          false,
        );
        if (result === "created") absencesCreated++;
      }
    }
    return { students, absencesCreated };
  },
});

// One-time assignment reconciliation (2026-09-05): the legacy
// per-student leadingSessions/observingSessions arrays held assignment
// history the sessions table lacked — students wired in the arrays but
// not in leaderIds/observerIds, and real class dates never recorded in
// the 课程日期 calendar (e.g. 2023春季 ran Feb-Mar, not the synthesized
// April Sundays). This pass creates the missing session rows
// (estimated: true), wires every stored date into the sessions table,
// then strips the arrays — leaving sessions.leaderIds/observerIds the
// single source of assignment truth, with the per-student views
// deriving from it. Idempotent: wiring dedupes; the strip no-ops once
// applied. Run via: npx convex run migrations:reconcileAssignments [--prod]
export const reconcileAssignments = internalMutation({
  handler: async (ctx) => {
    const report = {
      sessionsCreated: 0,
      wiresAdded: 0,
      studentsStripped: 0,
    };
    const sessionsByKey = new Map(
      (await ctx.db.query("sessions").collect()).map((s) => [
        `${s.quarter}:${s.date}`,
        s,
      ]),
    );
    const pending = new Map<
      Id<"sessions">,
      { leaderIds: Id<"students">[]; observerIds: Id<"students">[] }
    >();
    for (const s of await ctx.db.query("students").collect()) {
      const arrays = s as {
        leadingSessions?: string[];
        observingSessions?: string[];
      };
      const roles = [
        { dates: arrays.leadingSessions, field: "leaderIds" },
        { dates: arrays.observingSessions, field: "observerIds" },
      ] as const;
      let touched = false;
      for (const { dates, field } of roles) {
        for (const date of dates ?? []) {
          if (!s.quarter) continue;
          const key = `${s.quarter}:${date}`;
          let sess = sessionsByKey.get(key);
          if (!sess) {
            const id = await ctx.db.insert("sessions", {
              date,
              quarter: s.quarter,
              leaderIds: [],
              observerIds: [],
              estimated: true,
            });
            sess = (await ctx.db.get(id))!;
            sessionsByKey.set(key, sess);
            report.sessionsCreated++;
          }
          if (sess[field].includes(s._id)) continue;
          const slot = pending.get(sess._id) ?? {
            leaderIds: [],
            observerIds: [],
          };
          slot[field].push(s._id);
          pending.set(sess._id, slot);
          report.wiresAdded++;
          touched = true;
        }
      }
      if (touched || arrays.leadingSessions || arrays.observingSessions) {
        await ctx.db.patch(s._id, {
          leadingSessions: undefined,
          observingSessions: undefined,
        } as unknown as Partial<Doc<"students">>);
        report.studentsStripped++;
      }
    }
    for (const [id, slot] of pending) {
      const sess = await ctx.db.get(id);
      if (!sess) continue;
      await ctx.db.patch(id, {
        leaderIds: [...new Set([...sess.leaderIds, ...slot.leaderIds])],
        observerIds: [
          ...new Set([...sess.observerIds, ...slot.observerIds]),
        ],
      });
    }
    return report;
  },
});
