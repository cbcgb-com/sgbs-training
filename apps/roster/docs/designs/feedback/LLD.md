# End-of-term Feedback (小組查經帶領訓練反思) — Low-Level Design

**Created**: 2026-10-18
**HLD Link**: ../../high-level-design.md

## Overview

The training used a Google Form titled **小組查經帶領訓練反思** for
end-of-term reflection. Responses lived in Google's spreadsheet, not in
the church-owned roster. This feature brings that form into the roster
app so Eric owns the data: the same four required free-text questions,
one row per student per quarter, editable while the quarter is current,
and an instructor-only list.

The questions are copied from the original Google Form. The original
also collected the respondent's email and emailed them a copy. The
signed-in student identity already covers who answered; there is no
email-a-copy (the roster's SMTP path is for verification codes, not
form receipts).

## Why not Google Forms

A Google Form is easy to share and already existed. It is the wrong
shape now: the roster already has the student, the quarter, and the
login; a second identity (typed email) drifts from the student row;
Eric cannot list responses next to the rest of the season; and the
church does not own the sheet. The form stays a form — just inside
the app, keyed to `(studentId, quarter)`.

## Data Model

New table `feedback` in `convex/schema.ts`:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `studentId` | id | signed-in student row |
| `quarter` | string | from the student row on write |
| `newPractice` | string | Q1 first new method in weekly study |
| `leadingFocus` | string | Q2 what to watch next time they lead |
| `courseImprovements` | string | Q3 what the course can improve |
| `encouragement` | string | Q4 a word for other new leaders |
| `submittedAt` | number | epoch ms; set on first insert |
| `updatedAt` | number | epoch ms; refreshed on every write |

Indexes: `by_quarter` (`quarter`), `by_student` (`studentId`),
`by_student_quarter` (`studentId`, `quarter`). Convex has no unique
constraint; one-row-per-(student, quarter) is enforced in the upsert.

The four answer keys are ASCII (Convex constraint). Labels live in
`src/feedback.ts` — the same strings as the Google Form, Traditional
Chinese, required free text. No rating scales, no extra questions.

## Questions (verbatim from the Google Form)

Title: **小組查經帶領訓練反思**

1. 根據你在本課程中學到的一切，你想在週間查經中首先嘗試引入的新方法或新做法是什麼？
2. 你希望在下次帶領查經時，特別注意改進哪一方面？
3. 回顧過去的課堂內容，你認為我們有哪些可以改進的地方？
4. 請寫下你想對其他新手查經帶領者說的一句鼓勵的話。

Shared validators in `src/feedback.ts` (`parseFeedbackAnswers`) trim
each answer, reject blanks (`請填寫：…`), and cap length at 2000
characters (`回覆請控制在二千字以內`). The Convex mutation and the
unit script both call that helper.

## Backend surface (`convex/feedback.ts`)

### `feedback:mine` (query)

Signed-in only (`請先登入`). Does **not** throw when the caller is
unregistered or withdrawn — those are valid states for the prompt
card. Returns:

- `quarter` — `CURRENT_QUARTER`
- `registered` — active current-quarter student (not withdrawn)
- `open` — writes are accepted (`registered` is true; the quarter
  constant is still this season)
- `showPrompt` — `todayNy >=` the quarter's last session date
- `lastLessonDate` — that last session date, or null if none
- `response` — the caller's own row for this quarter, or null

`todayNy` comes from `readTodayNy` (same clock as derived withdrawal).
The last session date is the max `sessions.date` for `CURRENT_QUARTER`.

### `feedback:submit` (mutation)

Gated by `requireCurrentStudent`. The client never supplies
`studentId` or `quarter` — both come from the session identity.
Validates the four answers through `parseFeedbackAnswers`. Upserts
on `(studentId, CURRENT_QUARTER)`:

- no row → insert, set `submittedAt` and `updatedAt`, return
  `"created"`
- existing row → patch answers + `updatedAt`, leave `submittedAt`,
  return `"updated"`

A withdrawn or unregistered caller is rejected with
`請先註冊本季課程`. After `CURRENT_QUARTER` moves on, the same gate
makes a historical row unreachable — that is the quarter-end lock.

### `feedback:byQuarter` (query)

Instructor-only (`requireInstructor`). Default quarter is
`CURRENT_QUARTER`. Returns each row joined with the student's
`name`, `groupName`, and `fellowship` (no email — instructors already
have the roster). Sorted by `submittedAt` descending. Missing student
rows (deleted) still appear with empty name fields so a reflection is
never silently dropped.

## URL and UI

The app is a tabbed SPA, not a path router. `/feedback` is the
canonical URL: on load, that pathname opens the 回饋 tab; choosing
the tab writes `/feedback` with `replaceState`; other tabs write `/`.
Vercel rewrites `/feedback` to `index.html`. Signed-out visitors see
the existing guest sheet (報名／登入); after sign-in they stay on
`/feedback`.

- **Student** (`Feedback.tsx`): ruled ledger titled
  小組查經帶領訓練反思, four required textareas, 遞交. After
  submit, a 謝謝 resting state (same tone as registration). 修改回覆
  returns to the prefilled form. Resting state on a later visit is
  also 謝謝 if a row exists.
- **Instructor** (`FeedbackList.tsx`): 回饋 tab, quarter filter,
  one slip per response with the four answers. Empty state
  本季尚未收到反思.
- **Prompt**: a small slip on 我的資料 during/after the last lesson
  (`showPrompt` or an existing response). The 回饋 tab itself appears
  for students only then (or when they already answered, or when they
  landed on `/feedback`). Instructors always see the tab.

## Out of scope

- Emailing the student a copy of their answers
- Rating scales, NPS, homework-load, or any question not on the
  original Google Form
- Export / CSV (instructors read in-app; a dump can be a later CLI)
- Writing feedback for another person, or for a past quarter
- Production seeding of real student responses

## Related Documents

- [Feedback EARS](./feedback-EARS.md)
- [Authentication LLD](../authentication/LLD.md)
- [Withdrawal LLD](../withdrawal/LLD.md) — `requireCurrentStudent`
