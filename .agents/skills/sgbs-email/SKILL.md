---
name: sgbs-email
description: >
  Use when preparing, drafting, or reviewing any SGBS class email
  that a human must compose (weekly homework 功課, Saturday 功課提醒,
  attendance/reinvitation notice, or completion); when using the email
  generator app or its buttons; or when changing compose_homework_email(),
  get_lesson_info(), compose_homework_email_legacy(),
  compose_homework_reminder_email(), homework_reminder_subject(),
  compose_reinvitation_email(), compose_completion_email(), or
  completion_email_subject().
---

# SGBS Email Ops

Class emails are composed from `sgbs_training/email.py` and drafted for
Eric to review. Read [references/tone.md](references/tone.md) and the
matching type reference below; do not invent wording, lists, or
recipients.

Code is the source of truth: if a reference and `email.py` disagree,
the code wins — then update the reference. **Never send.** Save a
draft in HEY, sending FROM Eric's Gmail identity in HEY
(HEY's default sender), not the @hey.com address.

The roster app already sends 報名驗證碼, 歡迎報名, and 小組人數不足通知 —
those are out of scope.

## Map

- **Weekly homework** — after class N, lesson N (after class 2: John /
  「2」). To: `homework:classEmailList`. Cc: Duane Chang, Juan Chen,
  Christy Lin (see the reference). Voice:
  [references/tone.md](references/tone.md). Procedure:
  [references/weekly-homework.md](references/weekly-homework.md).
  Source of truth: `homework_email_subject()`, `get_lesson_info()`,
  `create_exercises()`, `compose_homework_email_legacy()` (default;
  wraps `compose_homework_email()`).
- **Saturday reminder** — day before Sunday class. Voice:
  [references/tone.md](references/tone.md). Procedure:
  [references/saturday-reminder.md](references/saturday-reminder.md).
  Source of truth: `compose_homework_reminder_email()`,
  `homework_reminder_subject()`.
- **Attendance / reinvitation notice** — a student missed two of the
  five classes, so they cannot complete this term. Individual. Voice:
  [references/tone.md](references/tone.md). Procedure:
  [references/reinvitation.md](references/reinvitation.md).
  Source of truth: `compose_reinvitation_email()`.
- **Completion** — after class 5 (end of term). To: students who met
  [docs/completion-policy.md](../../../docs/completion-policy.md)
  (at least 4 of 5, not withdrawn); confirm the list with Eric. Cc the
  regulars. Voice: [references/tone.md](references/tone.md).
  Procedure: [references/completion.md](references/completion.md).
  Source of truth: `completion_email_subject()`,
  `compose_completion_email()`.
- **Common mistakes** — before sending the draft to Eric.
  Read [references/common-mistakes.md](references/common-mistakes.md).
