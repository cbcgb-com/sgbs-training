// 小組查經帶領訓練反思 — the four required free-text questions copied
// from the original Google Form. Shared by the Convex write path and
// the student/instructor UI so labels cannot drift. ASCII keys (Convex);
// Traditional Chinese labels (the form). See
// docs/designs/feedback/LLD.md.

export const FEEDBACK_TITLE = "小組查經帶領訓練反思";

export const FEEDBACK_TEXT_MAX = 2000;

// 2025春季 Google Form had no Q3 (courseImprovements). The one-time
// import may store "" for that quarter only; the instructor list shows
// FORM_ABSENT_QUESTION instead of a blank. Student submit still requires
// all four answers — see parseFeedbackAnswers.
export const SPRING_2025_QUARTER = "2025春季";

export const FORM_ABSENT_QUESTION = "（當期表單無此題）";

export const FEEDBACK_QUESTIONS = [
  {
    key: "newPractice",
    label:
      "根據你在本課程中學到的一切，你想在週間查經中首先嘗試引入的新方法或新做法是什麼？",
  },
  {
    key: "leadingFocus",
    label: "你希望在下次帶領查經時，特別注意改進哪一方面？",
  },
  {
    key: "courseImprovements",
    label: "回顧過去的課堂內容，你認為我們有哪些可以改進的地方？",
  },
  {
    key: "encouragement",
    label: "請寫下你想對其他新手查經帶領者說的一句鼓勵的話。",
  },
] as const;

export type FeedbackFieldKey = (typeof FEEDBACK_QUESTIONS)[number]["key"];

export type FeedbackAnswers = Record<FeedbackFieldKey, string>;

export const EMPTY_FEEDBACK_ANSWERS: FeedbackAnswers = {
  newPractice: "",
  leadingFocus: "",
  courseImprovements: "",
  encouragement: "",
};

// Trim, require each answer, cap length. Throws a Chinese error the
// mutation surfaces as-is and the form can show on the ledger.
export function parseFeedbackAnswers(raw: FeedbackAnswers): FeedbackAnswers {
  const parsed = { ...EMPTY_FEEDBACK_ANSWERS };
  for (const q of FEEDBACK_QUESTIONS) {
    const value = (raw[q.key] ?? "").trim();
    if (!value) throw new Error(`請填寫：${q.label}`);
    if (value.length > FEEDBACK_TEXT_MAX) {
      throw new Error("回覆請控制在二千字以內");
    }
    parsed[q.key] = value;
  }
  return parsed;
}

// Same trim + 2000 cap as parseFeedbackAnswers, but courseImprovements
// may be empty when the historical form version lacked that question
// (2025春季 only). Used by the CLI import, never by student submit.
export function parseImportedFeedbackAnswers(
  raw: FeedbackAnswers,
  quarter: string,
): FeedbackAnswers {
  const parsed = { ...EMPTY_FEEDBACK_ANSWERS };
  for (const q of FEEDBACK_QUESTIONS) {
    const value = (raw[q.key] ?? "").trim();
    const allowEmpty =
      q.key === "courseImprovements" && quarter === SPRING_2025_QUARTER;
    if (!value && !allowEmpty) throw new Error(`請填寫：${q.label}`);
    if (value.length > FEEDBACK_TEXT_MAX) {
      throw new Error("回覆請控制在二千字以內");
    }
    parsed[q.key] = value;
  }
  return parsed;
}

// Instructor list: an empty courseImprovements is the 2025春季 form
// version, not a blank student answer. Other empty fields stay empty.
export function isAbsentFormQuestion(
  key: FeedbackFieldKey,
  value: string,
): boolean {
  return key === "courseImprovements" && !(value ?? "").trim();
}

export function displayFeedbackAnswer(
  key: FeedbackFieldKey,
  value: string,
): string {
  return isAbsentFormQuestion(key, value) ? FORM_ABSENT_QUESTION : value;
}

// The 回饋 slip / tab appears once the last class day has arrived
// (today in America/New_York on or after that Sunday).
export function shouldShowFeedbackPrompt(
  todayNy: string,
  lastLessonDate: string | null,
): boolean {
  return lastLessonDate !== null && todayNy >= lastLessonDate;
}

// ---- Google Form import planner --------------------------------------
// The Convex internalMutation supplies a store that talks to the table;
// unit tests use an in-memory store so dryRun / skip / conflict can be
// asserted without a deployment.

export const FEEDBACK_SOURCE_GOOGLE_FORM = "googleForm" as const;

export type ImportFeedbackRow = FeedbackAnswers & {
  sourceResponseKey: string;
  studentId: string;
  quarter: string;
  submittedAt: number;
};

export type ImportFeedbackWrite = FeedbackAnswers & {
  studentId: string;
  quarter: string;
  submittedAt: number;
  updatedAt: number;
  source: typeof FEEDBACK_SOURCE_GOOGLE_FORM;
  sourceResponseKey: string;
};

export type ImportFeedbackStore = {
  findBySourceResponseKey(key: string): Promise<boolean>;
  getStudentQuarter(studentId: string): Promise<string | null>;
  findByStudentQuarter(studentId: string, quarter: string): Promise<boolean>;
  insert(row: ImportFeedbackWrite): Promise<void>;
};

export type ImportFeedbackStatus =
  | "inserted"
  | "skipped_existing"
  | "conflict"
  | "error_student_quarter"
  | "error_validation";

export type ImportFeedbackError = {
  sourceResponseKey: string;
  studentId: string;
  quarter: string;
  reason: "error_student_quarter" | "error_validation";
  message: string;
};

export type ImportFeedbackSummary = {
  inserted: number;
  skipped_existing: number;
  conflict: number;
  errors: ImportFeedbackError[];
  results: Array<{
    sourceResponseKey: string;
    status: ImportFeedbackStatus;
  }>;
};

const STUDENT_QUARTER_ERROR = "學員不存在或季度不符";

function pairKey(studentId: string, quarter: string): string {
  return `${studentId}|${quarter}`;
}

async function decideImportedRow(
  store: ImportFeedbackStore,
  row: ImportFeedbackRow,
  seenKeys: Set<string>,
  seenPairs: Set<string>,
): Promise<
  | { status: "skipped_existing" }
  | { status: "conflict" }
  | { status: "error_student_quarter"; message: string }
  | { status: "error_validation"; message: string }
  | { status: "inserted"; answers: FeedbackAnswers }
> {
  const sourceResponseKey = row.sourceResponseKey.trim();
  if (!sourceResponseKey) {
    return { status: "error_validation", message: "請填寫來源列鍵" };
  }
  if (
    seenKeys.has(sourceResponseKey) ||
    (await store.findBySourceResponseKey(sourceResponseKey))
  ) {
    return { status: "skipped_existing" };
  }

  const studentQuarter = await store.getStudentQuarter(row.studentId);
  if (studentQuarter === null || studentQuarter !== row.quarter) {
    return { status: "error_student_quarter", message: STUDENT_QUARTER_ERROR };
  }

  if (
    seenPairs.has(pairKey(row.studentId, row.quarter)) ||
    (await store.findByStudentQuarter(row.studentId, row.quarter))
  ) {
    return { status: "conflict" };
  }

  try {
    const answers = parseImportedFeedbackAnswers(
      {
        newPractice: row.newPractice,
        leadingFocus: row.leadingFocus,
        courseImprovements: row.courseImprovements,
        encouragement: row.encouragement,
      },
      row.quarter,
    );
    return { status: "inserted", answers };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error_validation", message };
  }
}

// Classify each sheet row and optionally write. dryRun reports the same
// per-row outcomes (including in-batch skip/conflict) but never inserts.
export async function importFeedbackFromGoogleForm(
  store: ImportFeedbackStore,
  rows: ImportFeedbackRow[],
  options: { dryRun?: boolean } = {},
): Promise<ImportFeedbackSummary> {
  const seenKeys = new Set<string>();
  const seenPairs = new Set<string>();
  const summary: ImportFeedbackSummary = {
    inserted: 0,
    skipped_existing: 0,
    conflict: 0,
    errors: [],
    results: [],
  };

  for (const row of rows) {
    const sourceResponseKey =
      row.sourceResponseKey.trim() || row.sourceResponseKey;
    const decision = await decideImportedRow(store, row, seenKeys, seenPairs);
    summary.results.push({ sourceResponseKey, status: decision.status });

    if (decision.status === "inserted") {
      summary.inserted += 1;
      seenKeys.add(sourceResponseKey);
      seenPairs.add(pairKey(row.studentId, row.quarter));
      if (!options.dryRun) {
        await store.insert({
          studentId: row.studentId,
          quarter: row.quarter,
          ...decision.answers,
          submittedAt: row.submittedAt,
          updatedAt: row.submittedAt,
          source: FEEDBACK_SOURCE_GOOGLE_FORM,
          sourceResponseKey,
        });
      }
      continue;
    }

    if (decision.status === "skipped_existing") {
      summary.skipped_existing += 1;
      continue;
    }
    if (decision.status === "conflict") {
      summary.conflict += 1;
      continue;
    }

    summary.errors.push({
      sourceResponseKey,
      studentId: row.studentId,
      quarter: row.quarter,
      reason: decision.status,
      message: decision.message,
    });
  }

  return summary;
}
