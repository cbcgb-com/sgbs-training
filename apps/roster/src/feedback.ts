// 小組查經帶領訓練反思 — the four required free-text questions copied
// from the original Google Form. Shared by the Convex write path and
// the student/instructor UI so labels cannot drift. ASCII keys (Convex);
// Traditional Chinese labels (the form). See
// docs/designs/feedback/LLD.md.

export const FEEDBACK_TITLE = "小組查經帶領訓練反思";

export const FEEDBACK_TEXT_MAX = 2000;

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

// The 回饋 slip / tab appears once the last class day has arrived
// (today in America/New_York on or after that Sunday).
export function shouldShowFeedbackPrompt(
  todayNy: string,
  lastLessonDate: string | null,
): boolean {
  return lastLessonDate !== null && todayNy >= lastLessonDate;
}
