// Unit walkthrough of 小組查經帶領訓練反思 field helpers.
// No Convex — the Google Form questions and validators live in
// src/feedbackFields.ts so the mutation and the UI cannot drift.
// Run: node --experimental-strip-types scripts/test-feedback-fields.mjs

import {
  FEEDBACK_QUESTIONS,
  FEEDBACK_TEXT_MAX,
  FEEDBACK_TITLE,
  FORM_ABSENT_QUESTION,
  displayFeedbackAnswer,
  parseFeedbackAnswers,
  parseImportedFeedbackAnswers,
  shouldShowFeedbackPrompt,
} from "../src/feedbackFields.ts";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

check("page title is the Google Form title", FEEDBACK_TITLE === "小組查經帶領訓練反思");
check("exactly four questions", FEEDBACK_QUESTIONS.length === 4);
check(
  "Q1 is the first-practice prompt",
  FEEDBACK_QUESTIONS[0].key === "newPractice" &&
    FEEDBACK_QUESTIONS[0].label.includes("首先嘗試引入"),
);
check(
  "Q2 is the next-leading prompt",
  FEEDBACK_QUESTIONS[1].key === "leadingFocus" &&
    FEEDBACK_QUESTIONS[1].label.includes("下次帶領查經"),
);
check(
  "Q3 is the course-improve prompt",
  FEEDBACK_QUESTIONS[2].key === "courseImprovements" &&
    FEEDBACK_QUESTIONS[2].label.includes("可以改進的地方"),
);
check(
  "Q4 is the encouragement prompt",
  FEEDBACK_QUESTIONS[3].key === "encouragement" &&
    FEEDBACK_QUESTIONS[3].label.includes("一句鼓勵的話"),
);

const ok = {
  newPractice: "  先試觀察題  ",
  leadingFocus: "少講自己的結論",
  courseImprovements: "功課說明再清楚一些",
  encouragement: "慢慢來，組員會跟着你一起讀。",
};
const parsed = parseFeedbackAnswers(ok);
check("trim is applied", parsed.newPractice === "先試觀察題");
check(
  "all four answers survive",
  parsed.leadingFocus === ok.leadingFocus &&
    parsed.courseImprovements === ok.courseImprovements &&
    parsed.encouragement === ok.encouragement,
);

try {
  parseFeedbackAnswers({ ...ok, leadingFocus: "   " });
  check("blank answer is rejected", false);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  check(
    "blank answer names the question",
    msg.startsWith("請填寫：") && msg.includes("下次帶領查經"),
    msg.slice(0, 80),
  );
}

try {
  parseFeedbackAnswers({ ...ok, encouragement: "字".repeat(FEEDBACK_TEXT_MAX + 1) });
  check("overlong answer is rejected", false);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  check("overlong answer uses the 二千字 error", msg === "回覆請控制在二千字以內", msg);
}

check(
  "prompt hidden before the last lesson",
  shouldShowFeedbackPrompt("2026-10-11", "2026-10-18") === false,
);
check(
  "prompt shown on the last lesson",
  shouldShowFeedbackPrompt("2026-10-18", "2026-10-18") === true,
);
check(
  "prompt shown after the last lesson",
  shouldShowFeedbackPrompt("2026-10-25", "2026-10-18") === true,
);
check(
  "prompt hidden when the quarter has no dates",
  shouldShowFeedbackPrompt("2026-10-18", null) === false,
);

// ---- Import validation (historical Google Form) ----------------------
const imported = parseImportedFeedbackAnswers(
  { ...ok, newPractice: "  先試觀察題  " },
  "2025秋季",
);
check("import trims answers", imported.newPractice === "先試觀察題");

{
  const spring = parseImportedFeedbackAnswers(
    { ...ok, courseImprovements: "   " },
    "2025春季",
  );
  check(
    "2025春季 may omit courseImprovements",
    spring.courseImprovements === "",
  );
}

try {
  parseImportedFeedbackAnswers({ ...ok, courseImprovements: "   " }, "2025秋季");
  check("later quarter blank courseImprovements is rejected", false);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  check(
    "later quarter blank courseImprovements names Q3",
    msg.startsWith("請填寫：") && msg.includes("可以改進的地方"),
    msg.slice(0, 80),
  );
}

try {
  parseImportedFeedbackAnswers({ ...ok, encouragement: "   " }, "2025春季");
  check("2025春季 still requires encouragement", false);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  check(
    "2025春季 blank encouragement is rejected",
    msg.startsWith("請填寫：") && msg.includes("一句鼓勵的話"),
    msg.slice(0, 80),
  );
}

try {
  parseFeedbackAnswers({ ...ok, courseImprovements: "" });
  check("student submit still requires all four", false);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  check(
    "student submit still requires courseImprovements",
    msg.startsWith("請填寫：") && msg.includes("可以改進的地方"),
    msg.slice(0, 80),
  );
}

check(
  "empty courseImprovements displays the absent-question note",
  displayFeedbackAnswer("courseImprovements", "") === FORM_ABSENT_QUESTION &&
    FORM_ABSENT_QUESTION === "（當期表單無此題）",
);
check(
  "non-empty courseImprovements displays as written",
  displayFeedbackAnswer("courseImprovements", "功課說明再清楚一些") ===
    "功課說明再清楚一些",
);
check(
  "other empty answers do not get the absent-question note",
  displayFeedbackAnswer("encouragement", "") === "",
);

if (failures > 0) {
  console.log(`\n${failures} failing`);
  process.exit(1);
}
console.log("\nall passing");
