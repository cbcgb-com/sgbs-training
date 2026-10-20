// Unit walkthrough of the one-time Google Form feedback import.
// No Convex — the batch planner in src/feedbackFields.ts is what
// feedback:importFromGoogleForm calls, so inserted / skip / conflict /
// mismatch / dryRun are asserted here without touching a deployment.
// Run: node --experimental-strip-types scripts/test-feedback-import.mjs

import { importFeedbackFromGoogleForm } from "../src/feedbackFields.ts";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function answers(overrides = {}) {
  return {
    newPractice: "週間先用觀察題。",
    leadingFocus: "多留白。",
    courseImprovements: "功課說明再具體一些。",
    encouragement: "慢慢來，一起讀就好。",
    ...overrides,
  };
}

function row(overrides = {}) {
  return {
    sourceResponseKey: "sheet:1",
    studentId: "s_spring",
    quarter: "2025秋季",
    submittedAt: 1_734_300_000_000,
    ...answers(),
    ...overrides,
  };
}

function memoryStore(seed = {}) {
  const students = new Map(Object.entries(seed.students ?? {}));
  const bySource = new Map();
  const byPair = new Map();
  const writes = [];
  return {
    writes,
    rows() {
      return writes;
    },
    async findBySourceResponseKey(key) {
      return bySource.has(key);
    },
    async getStudentQuarter(studentId) {
      return students.has(studentId) ? students.get(studentId) : null;
    },
    async findByStudentQuarter(studentId, quarter) {
      return byPair.has(`${studentId}|${quarter}`);
    },
    async insert(doc) {
      writes.push(doc);
      bySource.set(doc.sourceResponseKey, true);
      byPair.set(`${doc.studentId}|${doc.quarter}`, true);
    },
    seedSource(key) {
      bySource.set(key, true);
    },
    seedPair(studentId, quarter) {
      byPair.set(`${studentId}|${quarter}`, true);
    },
  };
}

const students = {
  s_spring: "2025春季",
  s_fall: "2025秋季",
  s_next: "2026春季",
};

// ---- inserted -------------------------------------------------------
{
  const store = memoryStore({ students });
  const input = row({ studentId: "s_fall" });
  const summary = await importFeedbackFromGoogleForm(store, [input]);
  check("insert counts as inserted", summary.inserted === 1, JSON.stringify(summary));
  check("insert writes one row", store.writes.length === 1);
  check(
    "insert stamps googleForm + matching timestamps",
    store.writes[0]?.source === "googleForm" &&
      store.writes[0]?.submittedAt === input.submittedAt &&
      store.writes[0]?.updatedAt === input.submittedAt &&
      store.writes[0]?.sourceResponseKey === "sheet:1",
  );
  check(
    "insert trims answers",
    store.writes[0]?.newPractice === "週間先用觀察題。" &&
      store.writes[0]?.quarter === "2025秋季",
  );
}

// ---- idempotent re-run ----------------------------------------------
{
  const store = memoryStore({ students });
  const input = row({ studentId: "s_fall" });
  await importFeedbackFromGoogleForm(store, [input]);
  const again = await importFeedbackFromGoogleForm(store, [input]);
  check("re-run is skipped_existing", again.skipped_existing === 1 && again.inserted === 0);
  check("re-run writes nothing more", store.writes.length === 1);
}

{
  const store = memoryStore({ students });
  store.seedSource("sheet:1");
  const again = await importFeedbackFromGoogleForm(store, [
    row({ studentId: "s_fall" }),
  ]);
  check(
    "existing sourceResponseKey is skipped_existing",
    again.skipped_existing === 1 && store.writes.length === 0,
  );
}

// ---- conflict (in-app row already exists) ---------------------------
{
  const store = memoryStore({ students });
  store.seedPair("s_fall", "2025秋季");
  const summary = await importFeedbackFromGoogleForm(store, [
    row({ studentId: "s_fall" }),
  ]);
  check("existing (student, quarter) is conflict", summary.conflict === 1);
  check("conflict writes nothing", store.writes.length === 0);
}

// ---- student / quarter mismatch -------------------------------------
{
  const store = memoryStore({ students });
  const summary = await importFeedbackFromGoogleForm(store, [
    row({ studentId: "s_fall", quarter: "2025春季" }),
  ]);
  check(
    "quarter mismatch is error_student_quarter",
    summary.errors.length === 1 &&
      summary.errors[0]?.reason === "error_student_quarter" &&
      summary.inserted === 0,
    JSON.stringify(summary.errors),
  );
  check("mismatch writes nothing", store.writes.length === 0);
}

{
  const store = memoryStore({ students });
  const summary = await importFeedbackFromGoogleForm(store, [
    row({ studentId: "s_missing", quarter: "2025秋季" }),
  ]);
  check(
    "missing student is error_student_quarter",
    summary.errors.length === 1 &&
      summary.errors[0]?.reason === "error_student_quarter",
    JSON.stringify(summary.errors),
  );
}

// ---- blank courseImprovements: 2025春季 only ------------------------
{
  const store = memoryStore({ students });
  const summary = await importFeedbackFromGoogleForm(store, [
    row({
      studentId: "s_spring",
      quarter: "2025春季",
      sourceResponseKey: "sheet:spring",
      courseImprovements: "   ",
    }),
  ]);
  check(
    "2025春季 blank courseImprovements inserts",
    summary.inserted === 1 && store.writes[0]?.courseImprovements === "",
    JSON.stringify(summary),
  );
}

{
  const store = memoryStore({ students });
  const summary = await importFeedbackFromGoogleForm(store, [
    row({
      studentId: "s_fall",
      quarter: "2025秋季",
      courseImprovements: "   ",
    }),
  ]);
  check(
    "2025秋季 blank courseImprovements is a validation error",
    summary.errors.length === 1 &&
      summary.errors[0]?.reason === "error_validation" &&
      summary.inserted === 0 &&
      store.writes.length === 0,
    JSON.stringify(summary.errors),
  );
}

{
  const store = memoryStore({ students });
  const summary = await importFeedbackFromGoogleForm(store, [
    row({
      studentId: "s_next",
      quarter: "2026春季",
      sourceResponseKey: "sheet:2026s",
      courseImprovements: "",
    }),
  ]);
  check(
    "2026春季 blank courseImprovements is a validation error",
    summary.errors.length === 1 &&
      summary.errors[0]?.reason === "error_validation",
    JSON.stringify(summary.errors),
  );
}

// ---- dryRun writes nothing ------------------------------------------
{
  const store = memoryStore({ students });
  const input = row({ studentId: "s_fall" });
  const summary = await importFeedbackFromGoogleForm(store, [input], {
    dryRun: true,
  });
  check(
    "dryRun still reports inserted",
    summary.inserted === 1 && summary.results[0]?.status === "inserted",
    JSON.stringify(summary),
  );
  check("dryRun writes nothing", store.writes.length === 0);
}

{
  const store = memoryStore({ students });
  const first = row({ studentId: "s_fall", sourceResponseKey: "sheet:a" });
  const duplicate = row({ studentId: "s_fall", sourceResponseKey: "sheet:a" });
  const summary = await importFeedbackFromGoogleForm(
    store,
    [first, duplicate],
    { dryRun: true },
  );
  check(
    "dryRun still sees in-batch duplicates as skipped_existing",
    summary.inserted === 1 && summary.skipped_existing === 1,
    JSON.stringify(summary),
  );
  check("dryRun in-batch duplicate writes nothing", store.writes.length === 0);
}

{
  const store = memoryStore({ students });
  store.seedPair("s_fall", "2025秋季");
  const summary = await importFeedbackFromGoogleForm(
    store,
    [row({ studentId: "s_fall" })],
    { dryRun: true },
  );
  check(
    "dryRun reports conflict without writing",
    summary.conflict === 1 && store.writes.length === 0,
  );
}

if (failures > 0) {
  console.log(`\n${failures} failing`);
  process.exit(1);
}
console.log("\nall passing");
