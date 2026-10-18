# Group Coverage (人數不足合併) — Low-Level Design

**Created**: 2026-10-18
**HLD Link**: ../../high-level-design.md
**Depends on**: [Withdrawal LLD](../withdrawal/LLD.md)

## Overview

When a current-quarter group drops below 3 active members after a
withdrawal, instructors need a follow-up: the leftover pair (or one
person) cannot run the rest of the season as a group. Coverage is that
follow-up. A group of exactly 3 is not flagged.

The roster proposes a merge target (the smallest other named group).
Groups never change without an instructor's confirmation. The merge lasts
the rest of the quarter: members take the target `groupName`. Remaining
weeks' 主領/觀察 for the combined group are cleared so the new group
re-picks in 課堂安排.

Restoring a group after a correction that makes a withdrawn student
active again is out of scope. They stay unassigned until an instructor
places them.

## Trigger

A student is withdrawn (manual `withdrawnAt` or derived two-miss) and
removed from their group (`clearGroupAndAssignments`). After that write,
if the former group still exists and has 1 or 2 active members, start
the follow-up.

Empty groups (0 remaining) are not a merge candidate; the notice is
resolved. Ungrouped students are not a group.

## Notify

Two channels, same copy (「{組名} 只剩 {n} 人，需要合併」):

- An in-app banner for instructors on 名單 and 課堂安排. Derived from
  **live** active counts, so it stays until the group is merged (or
  otherwise reaches 3).
- An email to active instructors through the existing Gmail SMTP path
  (`convex/authEmail.ts`, `SMTP_USER` / `SMTP_PASS`). One send per
  (quarter, groupName) while the group stays understaffed. `@example.com`
  allowlist rows are skipped. Failed sends leave the notice unsent so
  the hourly sweep can retry.

No new email provider.

## Resolve: merge for the rest of the quarter

`groupCoverage.mergeGroups({ from, to })` (instructor only):

1. Move every active current-quarter member of `from` onto `to`.
2. Record each moved student as a late joiner of `to`.
3. Strip `leaderIds` / `observerIds` for the **combined** group's members
   on session dates `>= todayNy` (America/New_York, same `appMeta` clock
   as withdrawal). Past weeks stay as history.
4. Resolve the coverage notice for `from`. If `to` now has 3+ members,
   resolve its notice too.

The instructor confirms in the banner (proposed target pre-selected; they
may pick a different named group). There is no auto-merge.

## Leader / observer rules (every group, every assigned week)

The rule is **not merge-only**. It applies to first-time 課堂安排
writes and to leftover collisions after a merge.

`sessions.leaderIds` / `observerIds` are flat arrays for the whole class
that week. A group is the subset of those ids whose students share a
`groupName`. 未分組 is not a group. Lesson 1 has no assignments.

For every named group on every lesson-2+ week:

- At most one 主領. A write that would leave a named group with two
  主領 is **rejected** (`每組每堂只能有一位主領`). Existing two-leader
  rows (seed data, a past week after a merge) still display; the
  instructor removes one. Missing 主領 or 觀察 never block a save.
- At least one 觀察. Missing 觀察 is a warning, not a save block —
  the instructor or group may still be filling the week.
- Missing 主領 is also flagged. Empty lesson-2+ weeks (no chips yet)
  show both missing-主領 and missing-觀察, so a cleared post-merge
  week asks to be re-picked.

The shared helper is `src/assignmentRules.ts`
(`groupWeekAssignmentIssues` + `groupsExceedingLeaderCap`). 課堂安排
renders 「需要調整：…」 with the specific reason. The same helper
backs `updateSessionAssignments` and `addMeToSession`.

Late joiners (including through a merge) still show an observe-twice
hint that does not block assigning them as 主領.

## Data Model

| Table | Role |
| ----- | ---- |
| `groupCoverageNotices` | Dedupes instructor email. Not the banner source. |
| `groupLateJoiners` | Merge arrivals, for the observe-twice hint. |

Groups remain the set of current-quarter students sharing `groupName`.
No group table.

## Not now

- Reinstating a student's old group after a correction that makes them
  active again.
- Auto-merge, timed merges, or merging without an instructor.

## Related Documents

- [Group Coverage EARS](./group-coverage-EARS.md)
- [Withdrawal LLD](../withdrawal/LLD.md)
- [Group Assignment LLD](../group-assignment/LLD.md)
- [Schedule LLD](../schedule/LLD.md)
