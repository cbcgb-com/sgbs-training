# End-of-term Feedback (小組查經帶領訓練反思) — EARS

**Parent LLD**: ./LLD.md

## Questions (Google Form)

- [x] **FB-Q-001**: The system shall use exactly the four required
      free-text questions from the original Google Form titled
      小組查經帶領訓練反思, and no other prompts or rating scales.
- [x] **FB-Q-002**: The student page title shall be
      小組查經帶領訓練反思.
- [x] **FB-Q-003**: The system shall identify the respondent from the
      student row (`studentId`). It shall not store a typed email or
      email a copy of the answers. Offline matching of a Google Form
      response to a student (by email) is allowed for the one-time
      import; the email is never written to `feedback`.

## Soft State

- [x] **FB-STATE-001**: The system shall store one `feedback` row per
      `(studentId, quarter)`, never deleting on edit.
- [x] **FB-STATE-002**: The system shall derive `quarter` from the
      student's current-quarter row (`CURRENT_QUARTER` on write). The
      client shall not supply `studentId` or `quarter`.
- [x] **FB-STATE-003**: When a student submits for the first time, the
      system shall set `submittedAt` and `updatedAt`. An edit shall
      refresh `updatedAt` only.

## Student Write

- [x] **FB-SELF-001**: While signed in as a registered, active student,
      the system shall accept a submit/update of the four answers.
- [x] **FB-SELF-002**: If a row for `(studentId, CURRENT_QUARTER)`
      already exists, the system shall update it in place and return
      `"updated"` — never insert a second row.
- [x] **FB-SELF-003**: If any answer is blank after trimming, then the
      system shall reject the write with 請填寫： plus the question
      text.
- [x] **FB-SELF-004**: If any answer exceeds 2000 characters, then the
      system shall reject the write with 回覆請控制在二千字以內.
- [x] **FB-SELF-005**: If a withdrawn or unregistered caller submits,
      then the system shall reject it with 請先註冊本季課程.
- [x] **FB-SELF-006**: After `CURRENT_QUARTER` moves on, the system
      shall keep historical rows readable by instructors and
      unreachable for student writes (`requireCurrentStudent`).

## Instructor Read

- [x] **FB-ADM-001**: Where the actor is an active instructor, the
      system shall list responses for a quarter (default: current),
      joined with student name, group, and fellowship.
- [x] **FB-ADM-002**: If an unauthenticated caller reads the list,
      then the system shall reject it with 請先登入.
- [x] **FB-ADM-003**: If a signed-in non-instructor reads the list,
      then the system shall reject it with 僅限同工存取.

## UI

- [x] **FB-UI-001**: `/feedback` shall open the 回饋 surface. Other
      tabs stay on `/`.
- [x] **FB-UI-002**: After a successful submit, the student surface
      shall show a 謝謝 resting state, with 修改回覆 returning to the
      prefilled form.
- [x] **FB-UI-003**: During or after the last lesson of the current
      quarter, 我的資料 shall offer an unobtrusive link to `/feedback`.
- [x] **FB-UI-004**: The student 回饋 tab shall appear during/after
      the last lesson, when a response already exists, or when the
      visitor landed on `/feedback`. Instructors always see the tab.

## Historical import

- [x] **FB-IMP-001**: The system shall accept a batch import of
      historical Google Form responses through the internal mutation
      `feedback:importFromGoogleForm` (`rows` plus optional `dryRun`).
      The browser shall not be able to call it.
- [x] **FB-IMP-002**: If a row with the same `sourceResponseKey`
      already exists, then the system shall return `skipped_existing`
      and write nothing for that row.
- [x] **FB-IMP-003**: If the named student is missing or
      `student.quarter` does not equal the row's `quarter`, then the
      system shall return `error_student_quarter` and write nothing
      for that row.
- [x] **FB-IMP-004**: If that student already has a `feedback` row
      for the quarter, then the system shall return `conflict` and
      shall not overwrite the existing row.
- [x] **FB-IMP-005**: If `courseImprovements` is blank after trimming
      and `quarter` is `2025春季`, then the system shall accept the
      row. For every other quarter, and on the student submit path,
      a blank `courseImprovements` shall still be rejected.
- [x] **FB-IMP-006**: When `dryRun` is true, the system shall report
      the same per-row outcomes and shall write nothing.
- [x] **FB-IMP-007**: An imported row shall set `source` to
      `googleForm` and `submittedAt = updatedAt` to the sheet
      timestamp. The instructor list shall show
      「（當期表單無此題）」 in muted text when
      `courseImprovements` is empty, and no other import label.

## Related Documents

- [Feedback LLD](./LLD.md)
