// End-to-end walkthrough of 功課記錄 (homework tracking) against the DEV
// deployment. Drives the REAL agent entry point — `npx convex run
// homework:recordHomework` (the write functions are internal: the browser
// client can never touch homework, so the test goes through the CLI the
// same way the weekly agent workflow does) — and asserts every rule from
// docs/designs/homework/LLD.md: the instructor-gated read, session-date
// validation, the questions-credit gate (主領/觀察 only), upsert
// semantics (re-running a week updates in place, never duplicates), and
// clearHomework retraction.
//
// Prereqs (dev deployment):
//   npx convex dev --once
//   npx convex run demo:seedPreviewDemo
//   npx convex run instructors:upsert '{"email":"wit-test-instructor@example.com","name":"測試同工","active":true}'
//
// Run: node scripts/test-homework.mjs   (cwd: apps/roster — pins the dev
// deployment via .env.local / CONVEX_DEPLOYMENT)

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = "https://rugged-oriole-958.convex.cloud";
const STUDENT = "demo3@demo.sgbs";
const INSTRUCTOR = "wit-test-instructor@example.com";
const QUARTER = "2026秋季";
const APP_DIR = fileURLToPath(new URL("..", import.meta.url));

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// The agent's write path: `npx convex run homework:<fn> '<json>'` against
// the deployment pinned in apps/roster/.env.local (dev for this test,
// prod for the real weekly flow). Returns { ok, out } — errors come back
// on stderr with a non-zero exit.
function convexRun(fn, args) {
  const r = spawnSync("npx", ["convex", "run", `homework:${fn}`, JSON.stringify(args)], {
    cwd: APP_DIR,
    encoding: "utf8",
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
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

// ---- 0. Locate subjects ------------------------------------------------
const schedule = (await instructor.query(api.students.schedule, {}))
  .filter((s) => s.quarter === QUARTER)
  .sort((a, b) => a.date.localeCompare(b.date));
if (schedule.length === 0) {
  throw new Error("seed demo data first: npx convex run demo:seedPreviewDemo");
}

// A leading week (not orientation) that has both a 主領 and an 觀察, so
// the questions-credit rule can be exercised both ways.
const week = schedule.slice(1).find((s) => s.leaders.length > 0 && s.observers.length > 0);
if (!week) {
  throw new Error("no leading week with both 主領 and 觀察 assigned in the demo seed");
}
const DATE = week.date;

// name → id mapping — the exact lookup the weekly agent flow uses to
// turn Google Doc page headings into student ids (via the CLI, since the
// roster read is internal).
const rosterRun = convexRun("quarterRoster", {});
check("quarterRoster (agent name→id lookup) runs via CLI", rosterRun.ok);
const rosterJson = JSON.parse(rosterRun.out.slice(rosterRun.out.indexOf("[")));
const idOf = (name) => rosterJson.find((s) => s.name === name)?._id;

const leader = week.leaders[0];
const observer = week.observers[0];
const leaderId = idOf(leader.name);
const studentEmails = (await instructor.query(api.students.all, {}))
  .filter((s) => s.quarter === QUARTER && s.withdrawnAt === undefined);
const assigned = new Set([...week.leaders, ...week.observers].map((p) => p._id));
const bystander = studentEmails.find((s) => !assigned.has(s._id));
const subject = studentEmails.find((s) => s.email === STUDENT) ?? studentEmails[0];
if (!bystander || !subject) throw new Error("demo roster too small for the scenario");

// ---- 1. Surface gates ---------------------------------------------------
{
  // The writes are internal: the generated api object lists them, but the
  // server refuses browser calls — the agent (via `npx convex run`) is
  // the only writer.
  const student = await as(STUDENT);
  await expectReject(
    "browser client cannot call internal recordHomework",
    student.mutation(api.homework.recordHomework, {
      studentId: rosterJson[0]._id,
      date: DATE,
      type: "notes",
      done: true,
    }),
    "Could not find public function",
  );
}
{
  const anon = new ConvexHttpClient(CONVEX_URL);
  await expectReject(
    "unauthenticated marks read rejected 請先登入",
    anon.query(api.homework.byQuarter, {}),
    "請先登入",
  );
}
{
  const student = await as(STUDENT);
  await expectReject(
    "student marks read rejected 僅限同工存取",
    student.query(api.homework.byQuarter, {}),
    "僅限同工存取",
  );
}
check(
  "instructor marks read returns a list",
  Array.isArray(await instructor.query(api.homework.byQuarter, {})),
);

// ---- 2. recordHomework validation --------------------------------------
{
  const r = convexRun("recordHomework", {
    studentId: subject._id,
    date: "2026-12-25",
    type: "notes",
    done: true,
  });
  check(
    "non-session date rejected 此日期不是該季的上課日期",
    !r.ok && r.out.includes("此日期不是該季的上課日期"),
    r.out.split("\n").find((l) => l.includes("Error")) ?? "",
  );
}
{
  const r = convexRun("recordHomework", {
    studentId: bystander._id,
    date: DATE,
    type: "questions",
    done: true,
  });
  check(
    "questions for non-主領/觀察 rejected 查經題目僅限該週的主領或觀察",
    !r.ok && r.out.includes("查經題目僅限該週的主領或觀察"),
    r.out.split("\n").find((l) => l.includes("Error")) ?? "",
  );
}

// ---- 3. Upsert round trip (never duplicates) ----------------------------
const rowsFor = async (studentId) =>
  (await instructor.query(api.homework.byQuarter, {})).filter(
    (r) => r.studentId === studentId,
  );

{
  const r1 = convexRun("recordHomework", {
    studentId: subject._id,
    date: DATE,
    type: "notes",
    done: true,
  });
  check("record notes done → created", r1.ok && r1.out.includes('"created"'));
  let rows = await rowsFor(subject._id);
  check(
    "read shows notes ✓ 已完成",
    rows.length === 1 && rows[0].type === "notes" && rows[0].done === true && rows[0].date === DATE,
  );

  const r2 = convexRun("recordHomework", {
    studentId: subject._id,
    date: DATE,
    type: "notes",
    done: true,
  });
  check("identical re-run → unchanged", r2.ok && r2.out.includes('"unchanged"'));
  check("re-run did not duplicate", (await rowsFor(subject._id)).length === 1);

  const r3 = convexRun("recordHomework", {
    studentId: subject._id,
    date: DATE,
    type: "notes",
    done: false,
  });
  check("flip to 未完成 → updated", r3.ok && r3.out.includes('"updated"'));
  rows = await rowsFor(subject._id);
  check(
    "read shows notes ✗ 未完成, still one row",
    rows.length === 1 && rows[0].done === false,
  );
}

// ---- 4. questions credit for the week's 主領 and 觀察 -------------------
{
  const r1 = convexRun("recordHomework", {
    studentId: leaderId,
    date: DATE,
    type: "questions",
    done: true,
  });
  check("questions for the week's 主領 → created", r1.ok && r1.out.includes('"created"'));
  const r2 = convexRun("recordHomework", {
    studentId: idOf(observer.name),
    date: DATE,
    type: "questions",
    done: true,
  });
  check("questions for the week's 觀察 → created", r2.ok && r2.out.includes('"created"'));
  const rows = (await instructor.query(api.homework.byQuarter, {})).filter(
    (r) => r.date === DATE && r.type === "questions",
  );
  check(
    "both roles' questions rows visible in the read",
    rows.length === 2 && rows.every((r) => r.done === true),
  );
}

// ---- 5. clearHomework retraction ---------------------------------------
{
  const r1 = convexRun("clearHomework", {
    studentId: subject._id,
    date: DATE,
    type: "notes",
  });
  check("clear recorded row → deleted", r1.ok && r1.out.includes('"deleted"'));
  check("cleared row gone from the read", (await rowsFor(subject._id)).length === 0);
  const r2 = convexRun("clearHomework", {
    studentId: subject._id,
    date: DATE,
    type: "notes",
  });
  check("clear again is a no-op", r2.ok && r2.out.includes('"unchanged"'));
}

// ---- 6. Leave dev clean -------------------------------------------------
{
  const leftovers = await instructor.query(api.homework.byQuarter, {});
  for (const r of leftovers) {
    convexRun("clearHomework", {
      studentId: r.studentId,
      date: r.date,
      type: r.type,
    });
  }
  const after = await instructor.query(api.homework.byQuarter, {});
  check("dev homework table left clean", after.length === 0);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
