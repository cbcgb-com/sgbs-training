// End-to-end walkthrough of 小組查經帶領訓練反思 against the DEV
// deployment. Drives the real Convex functions the app calls — student
// submit/update, one-row-per-(student, quarter), validation, and the
// instructor-gated list. See docs/designs/feedback/LLD.md.
//
// Prereqs (dev deployment):
//   npx convex dev --once
//   npx convex run demo:seedPreviewDemo
//   npx convex run instructors:upsert '{"email":"wit-test-instructor@example.com","name":"測試同工","active":true}'
//
// Run: node scripts/test-feedback.mjs   (cwd: apps/roster — pins the
// dev deployment via .env.local / CONVEX_DEPLOYMENT)
//
// Never writes to prod. Demo emails only (@demo.sgbs).

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = "https://rugged-oriole-958.convex.cloud";
const STUDENT = "demo3@demo.sgbs";
const OTHER = "demo1@demo.sgbs";
const INSTRUCTOR = "wit-test-instructor@example.com";
const QUARTER = "2026秋季";

const SAMPLE = {
  newPractice: "週間先用觀察題，不急着給答案。",
  leadingFocus: "多留白，讓組員把經文讀完。",
  courseImprovements: "功課說明再具體一些。",
  encouragement: "你已經在讀了，組員會跟着你。",
};

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
const all = await instructor.query(api.students.all, {});
const row = all.find((s) => s.email === STUDENT && s.quarter === QUARTER);
if (!row) {
  throw new Error("seed demo data first: npx convex run demo:seedPreviewDemo");
}

// ---- 0. Gates -------------------------------------------------------
{
  const anon = new ConvexHttpClient(CONVEX_URL);
  await expectReject(
    "unauthenticated mine rejected 請先登入",
    anon.query(api.feedback.mine, {}),
    "請先登入",
  );
  await expectReject(
    "unauthenticated list rejected 請先登入",
    anon.query(api.feedback.byQuarter, {}),
    "請先登入",
  );
}
{
  const student = await as(STUDENT);
  await expectReject(
    "student list rejected 僅限同工存取",
    student.query(api.feedback.byQuarter, {}),
    "僅限同工存取",
  );
}

// ---- 1. Student mine + first submit --------------------------------
const student = await as(STUDENT);
const before = await student.query(api.feedback.mine, {});
check("mine reports current quarter", before.quarter === QUARTER, before.quarter);
check("active student is registered and open", before.registered === true && before.open === true);

await expectReject(
  "blank answer rejected 請填寫",
  student.mutation(api.feedback.submit, { ...SAMPLE, newPractice: "   " }),
  "請填寫",
);

const created = await student.mutation(api.feedback.submit, SAMPLE);
check("first submit returns created", created.status === "created", JSON.stringify(created));

const afterCreate = await student.query(api.feedback.mine, {});
check(
  "mine returns the four answers",
  afterCreate.response?.newPractice === SAMPLE.newPractice &&
    afterCreate.response?.leadingFocus === SAMPLE.leadingFocus &&
    afterCreate.response?.courseImprovements === SAMPLE.courseImprovements &&
    afterCreate.response?.encouragement === SAMPLE.encouragement,
);
check(
  "submittedAt is set once",
  typeof afterCreate.response?.submittedAt === "number",
);

// ---- 2. Upsert (no second row) -------------------------------------
const revised = { ...SAMPLE, encouragement: "慢慢來，一起讀就好。" };
const updated = await student.mutation(api.feedback.submit, revised);
check("second submit returns updated", updated.status === "updated", JSON.stringify(updated));

const afterUpdate = await student.query(api.feedback.mine, {});
check(
  "edit replaced the encouragement",
  afterUpdate.response?.encouragement === revised.encouragement,
);
check(
  "submittedAt survived the edit",
  afterUpdate.response?.submittedAt === afterCreate.response?.submittedAt,
);
check(
  "updatedAt moved forward",
  (afterUpdate.response?.updatedAt ?? 0) >= (afterCreate.response?.updatedAt ?? 0),
);

// ---- 3. Instructor list --------------------------------------------
const list = await instructor.query(api.feedback.byQuarter, { quarter: QUARTER });
const mineOnList = list.filter((r) => r.studentId === row._id);
check("one row per student on the instructor list", mineOnList.length === 1);
check(
  "list joins the student name (no email field)",
  mineOnList[0]?.name === row.name && !("email" in (mineOnList[0] ?? {})),
  mineOnList[0]?.name,
);
check(
  "list carries the edited encouragement",
  mineOnList[0]?.encouragement === revised.encouragement,
);

const other = await as(OTHER);
const otherMine = await other.query(api.feedback.mine, {});
check(
  "another student does not see this row",
  otherMine.response === null || otherMine.response?.encouragement !== revised.encouragement,
);

if (failures > 0) {
  console.log(`\n${failures} failing`);
  process.exit(1);
}
console.log("\nall passing");
