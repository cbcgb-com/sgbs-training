# Withdrawal (退出報名) — EARS

**Parent LLD**: ./LLD.md

## Soft State

- [x] **WDR-STATE-001**: The system shall represent withdrawal as the
      presence of `withdrawnAt` on the student row, never as deletion.
- [x] **WDR-STATE-002**: The system shall keep attendance rows and the
      `missed` count untouched when a student withdraws.
- [x] **WDR-STATE-003**: The system shall record an optional
      `withdrawnReason` string at withdrawal time.

## Student Self-Service

- [x] **WDR-SELF-001**: While signed in as a registered, active student,
      the system shall offer a 退出本季課程 action in 我的資料 behind a
      confirmation that states the effect and the re-registration path.
- [x] **WDR-SELF-002**: When the student confirms withdrawal, the system
      shall set `withdrawnAt`, store the optional reason, and clear the
      student's `groupName`.
- [x] **WDR-SELF-003**: When a student withdraws, the system shall remove
      them from every current-quarter session's 主領/觀察 arrays.
- [x] **WDR-SELF-004**: If a withdrawn student attempts another
      `requireCurrentStudent` action, then the system shall reject it with
      請先註冊本季課程 — including a second withdrawal attempt, which the
      gate makes unreachable from the self-service path.
- [x] **WDR-SELF-005**: Where an instructor withdraws an already-withdrawn
      student, the system shall treat it as a no-op and report
      already-withdrawn (instructor-path idempotence).

## Instructor Withdrawal

- [x] **WDR-ADM-001**: Where the actor is an active instructor, the system
      shall allow marking a student withdrawn with an optional reason.
- [x] **WDR-ADM-002**: When an instructor marks a student withdrawn, the
      system shall apply the same soft-state write and current-quarter
      session sweep as self-service withdrawal.
- [x] **WDR-ADM-003**: Where the actor is an active instructor, the system
      shall allow reactivating a withdrawn student, clearing
      `withdrawnAt` and `withdrawnReason`.
- [x] **WDR-ADM-004**: If a non-instructor calls an instructor withdrawal
      function, then the system shall reject it with 僅限同工存取.

## Re-registration = Reactivation

- [x] **WDR-RE-001**: When a registration arrives for an email whose
      same-quarter row is withdrawn, the system shall reactivate that row
      instead of inserting a second one.
- [x] **WDR-RE-002**: When reactivating, the system shall refresh the
      registration fields from the new submission and clear
      `withdrawnAt`/`withdrawnReason`.
- [x] **WDR-RE-003**: When reactivating, the system shall send the welcome
      email (same `sendWelcomeEmail` path as first registration).
- [x] **WDR-RE-004**: When reactivating with a newly uploaded photo, the
      system shall replace the stored photo and delete the previous blob.
- [x] **WDR-RE-005**: The system shall return status `"reactivated"` from
      both registration paths, rendered as the created success panel (the
      instructor path also maps `"duplicate"` to the 已註冊 copy).
- [x] **WDR-RE-006**: When a returning student registers for a new quarter,
      the system shall insert a new row (unchanged behavior).

## View Sweep

- [x] **WDR-VIEW-001**: The system shall exclude withdrawn students from
      `byQuarter`, `quarterAttendance`, `grouped`, `saveGroups`,
      `renameGroup`, `renameMyGroup`, `directory`, and `myGroup`.
- [x] **WDR-VIEW-006**: The system shall reject an instructor assignment
      that includes a withdrawn student (主領/觀察) with a named error, so
      the sweep cannot be undone by the assignment writer.
- [x] **WDR-VIEW-002**: The system shall keep withdrawn students visible in
      the Master view (`all`) with a 已退出 badge.
- [x] **WDR-VIEW-003**: The system shall report a withdrawn student as
      unregistered in `me` (so the 註冊 tab shows the registration form).
- [x] **WDR-VIEW-004**: The system shall report `withdrawn: true` plus the
      reason and date from `myProfile` for the 已退出 state.
- [x] **WDR-VIEW-005**: The system shall provide a dedicated 已退出 view
      listing withdrawn students, filterable by quarter.

## UI States

- [x] **WDR-UI-001**: After withdrawal, 我的資料 shall render the 已退出
      state with a 重新報名 action that opens the registration tab.
- [x] **WDR-UI-002**: The 已退出 view shall offer a 復原 action per row.
- [x] **WDR-UI-003**: The 本季度 roster view shall offer a 標記退出 action
      per active row with an inline confirmation carrying the optional
      reason.

## Related Documents

- [Withdrawal LLD](./LLD.md)
