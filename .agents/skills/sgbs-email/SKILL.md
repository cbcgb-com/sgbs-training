---
name: sgbs-email
description: >
  Use when preparing, drafting, or reviewing any SGBS class email
  (weekly homework 功課, Saturday 功課提醒, or reinvitation); when
  using the email generator app or its buttons; or when changing
  compose_homework_email(), get_lesson_info(),
  compose_homework_email_legacy(), compose_homework_reminder_email(),
  homework_reminder_subject(), or compose_reinvitation_email().
---

# SGBS Email Ops

Class emails are composed from `sgbs_training/email.py` and drafted for
Eric to review. Read the matching reference below; do not invent
wording, lists, or recipients.

Code is the source of truth: if a reference and `email.py` disagree,
the code wins — then update the reference. **Never send.** Save a
draft from Eric's HEY account. Roster welcome / verification-code
mail (`apps/roster/convex/authEmail.ts`, `no-reply-com@cbcgb.org`) is
out of scope.

## Map

- **Weekly homework** — after class N, lesson N (after class 2: John /
  「2」). To: `homework:classEmailList`. Cc: Duane Chang, Juan Chen,
  Christy Lin (see the reference). Read
  [references/weekly-homework.md](references/weekly-homework.md).
  Source of truth: `homework_email_subject()`, `get_lesson_info()`,
  `create_exercises()`, `compose_homework_email_legacy()` (default;
  wraps `compose_homework_email()`).
- **Saturday reminder** — day before Sunday class.
  Read [references/saturday-reminder.md](references/saturday-reminder.md).
  Source of truth: `compose_homework_reminder_email()`,
  `homework_reminder_subject()`.
- **Reinvitation** — a student missed too many of the five classes.
  Read [references/reinvitation.md](references/reinvitation.md).
  Source of truth: `compose_reinvitation_email()`.
- **Common mistakes** — before sending the draft to Eric.
  Read [references/common-mistakes.md](references/common-mistakes.md).
