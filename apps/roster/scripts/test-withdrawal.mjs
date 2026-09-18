// End-to-end walkthrough of 退出報名 (withdrawal, soft-state reactivation)
// against the DEV deployment. Drives the real Convex functions the app
// calls — self-service withdrawal, the view sweep, instructor on-behalf
// withdrawal/undo, and the re-registration reactivation path — and asserts
// the outcomes. See docs/designs/withdrawal/LLD.md.
//
// Prereqs (dev deployment):
//   npx convex dev --once
//   npx convex run demo:seedPreviewDemo
//   npx convex run instructors:upsert '{"email":"wit-test-instructor@example.com","name":"測試同工","active":true}'
//
// Run: node scripts/test-withdrawal.mjs

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = "https://rugged-oriole-958.convex.cloud";
const STUDENT = "demo3@demo.sgbs";
const INSTRUCTOR = "wit-test-instructor@example.com";

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

async function asStudent() {
  const client = new ConvexHttpClient(CONVEX_URL);
  client.setAuth(await tokenFor(STUDENT));
  return client;
}

async function asInstructor() {
  const client = new ConvexHttpClient(CONVEX_URL);
  client.setAuth(await tokenFor(INSTRUCTOR));
  return client;
}

const instructor = await asInstructor();

// ---- 0. Reset to active (idempotent) --------------------------------
// demo3 is the self-service subject; demo4 is the instructor on-behalf
// subject. Both start active regardless of how a previous run left them.
const allBefore = await instructor.query(api.students.all, {});
const current = (email) =>
  allBefore.find((s) => s.email === email && s.quarter === "2026秋季");
const row = current(STUDENT);
const second = current("demo4@demo.sgbs");
if (!row || !second) {
  throw new Error("seed demo data first: npx convex run demo:seedPreviewDemo");
}
for (const s of [row, second]) {
  if (s.withdrawnAt !== undefined) {
    await instructor.mutation(api.students.reactivateStudent, {
      studentId: s._id,
    });
  }
}

// ---- 1. Active student sees their record ---------------------------
let student = await asStudent();
let me = await student.query(api.students.me, {});
check("active student resolves in me", me?.student?.name === row.name, me?.student?.name);

let profile = await student.query(api.students.myProfile, {});
check("active profile: registered & not withdrawn", profile.registered === true && profile.withdrawn === false);

// ---- 2. Self-service withdrawal ------------------------------------
const reason = "時間無法配合";
const res = await student.mutation(api.students.withdrawFromQuarter, {
  reason,
});
check("withdraw returns status withdrawn", res.status === "withdrawn", JSON.stringify(res));

me = await student.query(api.students.me, {});
check("withdrawn student is unregistered in me", me?.student === null);

profile = await student.query(api.students.myProfile, {});
check(
  "profile carries the 已退出 state (reason + date)",
  profile.withdrawn === true && profile.withdrawnReason === reason && typeof profile.withdrawnAt === "number",
  JSON.stringify({ w: profile.withdrawn, r: profile.withdrawnReason }),
);

const group = await student.query(api.students.myGroup, {});
check("withdrawn student is out of their group", group.registered === false);

// Student self-service is gated now.
let gated = false;
try {
  await student.mutation(api.students.updateMyProfile, {
    name: "x",
    gender: "女",
    fellowship: "樂河團契",
    baptismTime: "少於1年",
    leadingExperience: "沒帶過",
  });
} catch (e) {
  gated = /請先註冊本季課程/.test(String(e?.message ?? e));
}
check("withdrawn student is gated by requireCurrentStudent", gated);

// Idempotence (instructor path): withdrawing an already-withdrawn row is
// a no-op and must not overwrite the recorded reason/date.
const dup = await instructor.mutation(api.students.withdrawStudent, {
  studentId: row._id,
  reason: "其他原因",
});
check("instructor withdrawal of a withdrawn row is a no-op", dup.status === "already", JSON.stringify(dup));
const afterDup = await instructor.query(api.students.withdrawn, {});
const dupRow = afterDup.find((w) => w.email === STUDENT);
check("the original reason survives the no-op", dupRow?.withdrawnReason === reason, String(dupRow?.withdrawnReason));

// ---- 3. View sweep --------------------------------------------------
const quarterRows = await instructor.query(api.students.byQuarter, {});
check("本季度 excludes the withdrawn row", !quarterRows.some((s) => s.email === STUDENT));

const allRows = await instructor.query(api.students.all, {});
const masterRow = allRows.find((s) => s.email === STUDENT);
check("Master keeps the withdrawn row (badge data)", masterRow?.withdrawnAt !== undefined);

const attendance = await instructor.query(api.students.quarterAttendance, {});
check("出勤 excludes the withdrawn row", !attendance.students.some((s) => s.name === row.name));

const kanban = await instructor.query(api.students.grouped, { field: "fellowship" });
check(
  "看板 excludes the withdrawn row",
  !kanban.some((g) => g.students.some((s) => s.email === STUDENT)),
);

const withdrawnRows = await instructor.query(api.students.withdrawn, {});
const wRow = withdrawnRows.find((w) => w.email === STUDENT);
check(
  "已退出 view lists the row with reason",
  !!wRow && wRow.withdrawnReason === reason,
  wRow ? JSON.stringify(wRow.withdrawnReason) : "missing",
);

const directory = await instructor.query(api.students.directory, {});
check("聯絡表 excludes the withdrawn row", !directory.some((d) => d.email === STUDENT));

// Group sweep: the groupName was cleared, and current-quarter sessions
// carry no assignment for this student.
check("withdrawal cleared groupName", masterRow?.groupName === undefined, String(masterRow?.groupName));
const schedule = await instructor.query(api.students.schedule, {});
const stillAssigned = schedule.some(
  (s) => [...s.leaders, ...s.observers].some((p) => p.name === row.name),
);
check("current-quarter sessions were swept", !stillAssigned);

// ---- 4. Instructor on-behalf withdrawal + undo ----------------------
// Withdraw a second demo student as an instructor, then reactivate.
const target = quarterRows.find((s) => s.email === "demo4@demo.sgbs");
const adm = await instructor.mutation(api.students.withdrawStudent, {
  studentId: target._id,
  reason: "個人因素",
});
check("instructor withdrawal succeeds", adm.status === "withdrawn", JSON.stringify(adm));
const afterAdm = await instructor.query(api.students.withdrawn, {});
check("instructor withdrawal appears in 已退出", afterAdm.some((w) => w.email === "demo4@demo.sgbs"));

const undo = await instructor.mutation(api.students.reactivateStudent, {
  studentId: target._id,
});
check("instructor undo reactivates", undo.status === "reactivated", JSON.stringify(undo));
const back = await instructor.query(api.students.byQuarter, {});
check("reactivated row returns to 本季度", back.some((s) => s.email === "demo4@demo.sgbs"));

// The assignment writer refuses a withdrawn student (the sweep cannot be
// undone by a malformed client).
const sessions = await instructor.query(api.students.schedule, {});
const week = sessions.find((s) => s.quarter === "2026秋季" && s.date !== sessions[0].date);
let assignmentGuard = false;
try {
  await instructor.mutation(api.students.updateSessionAssignments, {
    sessionId: week._id,
    leaderIds: [row._id],
    observerIds: [],
  });
} catch (e) {
  assignmentGuard = /已退出本季課程/.test(String(e?.message ?? e));
}
check("assignment writer rejects a withdrawn student", assignmentGuard);

// Repeated instructor withdrawal preserves the recorded reason/date.
const beforeDup = (await instructor.query(api.students.withdrawn, {})).find(
  (w) => w.email === STUDENT,
);
const dup2 = await instructor.mutation(api.students.withdrawStudent, {
  studentId: row._id,
  reason: "不應覆蓋",
});
const afterDup2 = (await instructor.query(api.students.withdrawn, {})).find(
  (w) => w.email === STUDENT,
);
check(
  "no-op withdrawal preserves reason and date",
  dup2.status === "already" &&
    afterDup2.withdrawnReason === beforeDup.withdrawnReason &&
    afterDup2.withdrawnAt === beforeDup.withdrawnAt,
  JSON.stringify({ reason: afterDup2.withdrawnReason }),
);

// ---- 5. Re-registration reactivates the same row --------------------
const { execSync } = await import("node:child_process");
const anon = new ConvexHttpClient(CONVEX_URL);
const listCodes = () =>
  JSON.parse(
    execSync(`npx convex run auth:getCodesByEmail '{"email":"${STUDENT}"}'`, {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
    }),
  );
const liveCodes = () =>
  listCodes().filter((c) => c.usedAt === undefined && c.expiresAt > Date.now());

// Request a fresh code unless the 3-per-10-min rate limit is already hit
// (the limiter is a separate feature; don't fail the withdrawal suite on it).
let live = liveCodes();
if (live.length === 0) {
  try {
    await anon.mutation(api.auth.requestCode, { email: STUDENT, name: "測試" });
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (!/過於頻繁/.test(msg)) throw e;
    console.log("NOTE  code-request rate limit hit; reusing an existing code");
  }
  live = liveCodes();
}
if (!live.length) throw new Error("no live code found for the student");
const code = live[live.length - 1].code;

const verified = await anon.mutation(api.auth.verifyRegistrationCode, {
  email: STUDENT,
  code,
  registration: {
    name: row.name,
    gender: "男",
    fellowship: "MIT團契（學生組）",
    baptismTime: "少於1年",
    leadingExperience: "沒帶過",
    confirmedAttendance: true,
  },
});
check("re-registration returns reactivated", verified.status === "reactivated", JSON.stringify(verified));

student = await asStudent();
me = await student.query(api.students.me, {});
profile = await student.query(api.students.myProfile, {});
check("reactivated student is a member again", me?.student?.name === row.name);
check(
  "reactivation cleared the soft state",
  profile.withdrawn === false && profile.withdrawnReason === null,
  JSON.stringify({ w: profile.withdrawn, r: profile.withdrawnReason }),
);

const finalRows = await instructor.query(api.students.byQuarter, {});
const finalSameEmail = finalRows.filter((s) => s.email === STUDENT);
check("exactly one row for the email (no duplicate)", finalSameEmail.length === 1, String(finalSameEmail.length));

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
