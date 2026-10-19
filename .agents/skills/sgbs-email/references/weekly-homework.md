# Weekly homework email

Homework is given right after class N finishes. The email after class N
uses lesson N — after class 2, use John and subject 「2」. Lesson 5 has
no homework. New thread. Body is Markdown (the generator runs
`markdown()` in `apps/api.py`); the sign-off is two paragraphs, no
HTML `<br>`.

Draft only, in HEY, FROM Eric's Gmail identity in HEY
(HEY's default sender), not the @hey.com address. See
[../SKILL.md](../SKILL.md) and
[common-mistakes.md](common-mistakes.md).

## After class N

| Class | Scripture | Book | Subject |
| ----- | --------- | ---- | ------- |
| 1 | Luke | 路加福音 | 小組查經帶領訓練課堂「1」功課 |
| 2 | John | 約翰福音 | 小組查經帶領訓練課堂「2」功課 |
| 3 | Ephesians | 以弗所書 | 小組查經帶領訓練課堂「3」功課 |
| 4 | James | 雅各書 | 小組查經帶領訓練課堂「4」功課 |

`homework_email_subject(N)` produces the subject (also the body's `##`
heading).

## Source of truth

- `homework_email_subject(N)` — subject
- `get_lesson_info()` — scripture → lesson, readings, extra exercises,
  greeting
- `create_exercises()` in `sgbs_training/docs.py` — Google Docs
- `compose_homework_email_legacy()` — default body composer (what
  `/form/scripture` and `apps/app.py` call). It loads
  `get_lesson_info()` and then `compose_homework_email()`. Use
  `compose_homework_email()` only when you already have those fields.

If this file and the code disagree, the code wins.

## Recipients

**To:** every `email` from `homework:classEmailList` (below).

**Cc:** Duane Chang, Juan Chen, and Christy Lin. Take their addresses
from the Cc line of last week's homework thread in HEY, or from a
private source — never from this repo. Do not invent addresses. If a
name is missing from last week's thread, leave that person off and
tell Eric.

Active students of the current term (`CURRENT_QUARTER` in
`apps/roster/src/constants.ts`, now `2026秋季`), not withdrawn — use
the shared helper (`withdrawalStatus` /
`filterActiveStudents` in `apps/roster/convex/attendanceStatus.ts`),
not `withdrawnAt` alone. From 2026秋季 a student with two misses is
withdrawn even if `withdrawnAt` is unset. With a non-empty email.
Table `students`, index `by_quarter`. Prod Convex: `abundant-dodo-507`.

Read-only agent query (internal; CLI, no browser session):

```bash
# from apps/roster; omit --prod on the dev deployment
npx convex run --prod homework:classEmailList '{}'
```

Optional `{ "quarter": "2026秋季" }` overrides the default current
term. Returns `[{ name, email, groupName }, …]` sorted zh-Hant by
name. Those emails are **To** only. Never run mutations against prod
for this step.

`students:byQuarter` is the same roster for the instructor UI, but it
needs an instructor session, so it is not the agent path.
`homework:quarterRoster` is the name→id lookup for 功課記錄 and does
not include email.

## Procedure

1. Look up class N in the table above (scripture + book + subject).
2. `create_exercises(scripture, num_students, num_groups)` in
   `sgbs_training/docs.py` creates two anyone-with-link writer Google
   Docs: `{book}查經題目` and `{book}查經筆記`. Creating a fresh pair
   for every draft is expected; unused drafts are disposable and can
   be ignored. Do not skip this step when credentials are available.
3. `compose_homework_email_legacy(scripture, questions_doc, notes_doc)`
   fills the body, including those doc links for 主領/觀察員 vs 其他人.
4. `npx convex run --prod homework:classEmailList '{}'` for **To**.
   **Cc** Duane Chang, Juan Chen, and Christy Lin as above.

Generator: "Generate Homework Email" → `POST /form/scripture` in
`apps/api.py` (`apps/templates/template.html`). Older Panel UI:
`apps/app.py`.
