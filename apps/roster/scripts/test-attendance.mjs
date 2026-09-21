// End-to-end walkthrough of 出席 (attendance recording) against the DEV
// deployment. Drives the real Convex functions the 出席 tab calls — the
// instructor gates, single-mark upsert/clear round-trip, the
// 未記錄全部出席 bulk fill (fill-unrecorded-only semantics), and the
// withdrawn-student exclusion — and asserts every outcome. See
// docs/designs/attendance/LLD.md.
//
// Prereqs (dev deployment):
//   npx convex dev --once
//   npx convex run demo:seedPreviewDemo
//   npx convex run instructors:upsert '{"email":"wit-test-instructor@example.com","name":"測試同工","active":true}'
//
// Run: node scripts/test-attendance.mjs

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = "https://rugged-oriole-958.convex.cloud";
const STUDENT = "demo3@demo.sgbs";
const WITHDRAW_SUBJECT = "demo7@demo.sgbs";
const INSTRUCTOR = "wit-test-instructor@example.com";
const QUARTER = "2026秋季";
const MARK_DATE = "2026-10-04"; // single-mark round trip
const BULK_DATE = "2026-10-11"; // bulk fill
const NOT_A_DATE = "2026-12-25"; // not a session date

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function tokenFor(email) {
  const anon = new ConvexHttpClient(CONVEX_URL);
  const { token } = await anon.action(api.auth.signIn, { email });
  return token;
}

async function as(email) {
  const client = new ConvexHttpClient(CONVEX_URL);
  client.setAuth(await tokenFor(email));
  return client;
}

async function expectReject(label, promise, needle) {
  try {
    await promise;
    check(label, false, "call unexpectedly succeeded");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    check(label, msg.includes(needle), msg.slice(0, 120));
  }
}

const instructor = await as(INSTRUCTOR);

async function sheet() {
  return instructor.query(api.students.quarterAttendance, {});
}
function markOf(data, studentId, date) {
  const i = data.dates.indexOf(date);
  const s = data.students.find((x) => x._id === studentId);
  return s ? (s.marks[i] ?? "none") : "absent-from-sheet";
}

// ---- 0. Locate subjects (idempotent reset) ---------------------------
const all = await instructor.query(api.students.all, {});
const current = (email) =>
  all.find((s) => s.email === email && s.quarter === QUARTER);
const subject = current(STUDENT);
const withdrawer = current(WITHDRAW_SUBJECT);
if (!subject || !withdrawer) {
  throw new Error("seed demo data first: npx convex run demo:seedPreviewDemo");
}
for (const s of [subject, withdrawer]) {
  if (s.withdrawnAt !== undefined) {
    await instructor.mutation(api.students.reactivateStudent, {
      studentId: s._id,
    });
  }
}
const missed0 = subject.missed;
check("baseline: demo3 on the sheet", markOf(await sheet(), subject._id, MARK_DATE) !== "absent-from-sheet");

// ---- 1. Gates ---------------------------------------------------------
{
  const anon = new ConvexHttpClient(CONVEX_URL);
  await expectReject(
    "unauthenticated record rejected 請先登入",
    anon.mutation(api.students.recordAttendance, {
      studentId: subject._id,
      date: MARK_DATE,
      attended: true,
    }),
    "請先登入",
  );
}
{
  const student = await as(STUDENT);
  await expectReject(
    "student record rejected 僅限同工存取",
    student.mutation(api.students.recordAttendance, {
      studentId: subject._id,
      date: MARK_DATE,
      attended: false,
    }),
    "僅限同工存取",
  );
  await expectReject(
    "student clear rejected 僅限同工存取",
    student.mutation(api.students.clearAttendance, {
      studentId: subject._id,
      date: MARK_DATE,
    }),
    "僅限同工存取",
  );
  await expectReject(
    "student bulk rejected 僅限同工存取",
    student.mutation(api.students.markAllAttended, { date: BULK_DATE }),
    "僅限同工存取",
  );
}
await expectReject(
  "non-session date rejected",
  instructor.mutation(api.students.recordAttendance, {
    studentId: subject._id,
    date: NOT_A_DATE,
    attended: true,
  }),
  "此日期不是該季的上課日期",
);
await expectReject(
  "bulk on non-session date rejected",
  instructor.mutation(api.students.markAllAttended, { date: NOT_A_DATE }),
  "此日期不是該季的上課日期",
);

// ---- 2. Single mark round trip (缺席 → flip 出席 → clear 未記錄) ------
{
  await instructor.mutation(api.students.recordAttendance, {
    studentId: subject._id,
    date: MARK_DATE,
    attended: false,
  });
  let data = await sheet();
  check("absent recorded", markOf(data, subject._id, MARK_DATE) === "no");
  check(
    "missed incremented",
    data.students.find((s) => s._id === subject._id).missed === missed0 + 1,
    `missed=${data.students.find((s) => s._id === subject._id).missed}, want ${missed0 + 1}`,
  );

  await instructor.mutation(api.students.recordAttendance, {
    studentId: subject._id,
    date: MARK_DATE,
    attended: true,
  });
  data = await sheet();
  check("flip to attended", markOf(data, subject._id, MARK_DATE) === "yes");
  check(
    "missed restored",
    data.students.find((s) => s._id === subject._id).missed === missed0,
  );

  const r1 = await instructor.mutation(api.students.clearAttendance, {
    studentId: subject._id,
    date: MARK_DATE,
  });
  check("clear returns deleted", r1 === "deleted");
  data = await sheet();
  check("cleared to 未記錄", markOf(data, subject._id, MARK_DATE) === "none");
  check(
    "missed stays baseline",
    data.students.find((s) => s._id === subject._id).missed === missed0,
  );

  const r2 = await instructor.mutation(api.students.clearAttendance, {
    studentId: subject._id,
    date: MARK_DATE,
  });
  check("clear again is a no-op", r2 === "unchanged");
}

// ---- 3. Bulk fill: fills only 未記錄, never overwrites ----------------
{
  // Start the bulk date from a clean sheet.
  const before = await sheet();
  for (const s of before.students) {
    await instructor.mutation(api.students.clearAttendance, {
      studentId: s._id,
      date: BULK_DATE,
    });
  }
  // One deliberate absent mark that must survive the fill.
  await instructor.mutation(api.students.recordAttendance, {
    studentId: subject._id,
    date: BULK_DATE,
    attended: false,
  });

  const sheetBefore = await sheet();
  const recordedBefore = sheetBefore.students.filter(
    (s) => (s.marks[sheetBefore.dates.indexOf(BULK_DATE)] ?? "none") !== "none",
  ).length;
  const total = sheetBefore.students.length;

  const { created } = await instructor.mutation(
    api.students.markAllAttended,
    { date: BULK_DATE },
  );
  check(
    "bulk created exactly the unrecorded rows",
    created === total - recordedBefore,
    `created=${created}, unrecorded=${total - recordedBefore} (of ${total})`,
  );

  const after = await sheet();
  const idx = after.dates.indexOf(BULK_DATE);
  const noneLeft = after.students.filter(
    (s) => (s.marks[idx] ?? "none") === "none",
  ).length;
  check("no student left 未記錄", noneLeft === 0, `${noneLeft} still unrecorded`);
  check(
    "explicit 缺席 survived the fill",
    markOf(after, subject._id, BULK_DATE) === "no",
  );
  check(
    "missed reflects the surviving absence",
    after.students.find((s) => s._id === subject._id).missed === missed0 + 1,
  );

  const second = await instructor.mutation(api.students.markAllAttended, {
    date: BULK_DATE,
  });
  check("second fill is a no-op", second.created === 0);

  // Restore: clear the bulk date back to 未記錄.
  for (const s of after.students) {
    await instructor.mutation(api.students.clearAttendance, {
      studentId: s._id,
      date: BULK_DATE,
    });
  }
  const restored = await sheet();
  const idxR = restored.dates.indexOf(BULK_DATE);
  check(
    "bulk date restored to 未記錄",
    restored.students.every((s) => (s.marks[idxR] ?? "none") === "none"),
  );
}

// ---- 4. Withdrawn students are off the sheet --------------------------
{
  await instructor.mutation(api.students.withdrawStudent, {
    studentId: withdrawer._id,
    reason: "時間無法配合",
  });
  const before = await sheet();
  const stillListed = before.students.some((s) => s._id === withdrawer._id);
  check("withdrawn student off the sheet", !stillListed);

  const { created } = await instructor.mutation(
    api.students.markAllAttended,
    { date: BULK_DATE },
  );
  check(
    "bulk skips the withdrawn student",
    created === before.students.length,
    `created=${created}, active=${before.students.length}`,
  );

  // Restore the demo state.
  await instructor.mutation(api.students.reactivateStudent, {
    studentId: withdrawer._id,
  });
  const after = await sheet();
  check(
    "reactivated student back on the sheet",
    after.students.some((s) => s._id === withdrawer._id),
  );

  // Clean the rows the two bulk fills created on BULK_DATE.
  for (const s of after.students) {
    await instructor.mutation(api.students.clearAttendance, {
      studentId: s._id,
      date: BULK_DATE,
    });
  }
}

// ---- 5. Final invariant: the subject is back to baseline --------------
{
  const data = await sheet();
  const row = data.students.find((s) => s._id === subject._id);
  check("final missed == baseline", row.missed === missed0, `missed=${row.missed}`);
  check(
    "MARK_DATE left 未記錄",
    markOf(data, subject._id, MARK_DATE) === "none",
  );
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
