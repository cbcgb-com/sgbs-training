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

## Leader / observer rules after a merge

- Exactly one 主領 per group per session. If two leaders from the
  combined group land on the same date, 課堂安排 flags 主領衝突. The
  write is not blocked — the instructor removes one.
- One or more 觀察 per session is allowed.
- Late joiners (including through a merge) show an observe-twice hint
  in 課堂安排. It is a hint, not a hard block: they can still be assigned
  主領.

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
