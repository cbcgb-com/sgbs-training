# Schedule — Low-Level Design

**Created**: 2026-08-30
**HLD Link**: ../../high-level-design.md

## Overview

課堂安排 covers the season's class dates and their 主領/觀察 assignments.
The season has five fixed class dates; the first (orientation,
課程信息介紹) never carries assignments, so the schedule holds exactly
**four leading weeks**. Assignments live on the session row; the
per-student 主領日期/觀察日期 views are derived by inversion.

## Data Model

### sessions

| Field | Type | Description |
| ----- | ---- | ----------- |
| date | string | ISO date, e.g. 2026-09-20 |
| quarter | optional string | e.g. 2026秋季 |
| leaderIds | `Id<students>[]` | students leading that week |
| observerIds | `Id<students>[]` | students observing that week |
| assistantNames | optional string[] | 助教 display names (from Airtable 教师) |
| airtableId / temp id arrays | optional | migration remnants |

There is deliberately **no add/delete date UI** — dates are fixed when the
season is set up (CLI helper `demo:deleteSessionByDate` exists for
corrections). One role per student per week is enforced by the self-
service flow; instructors may assign freely.

## Scoping

Both roles see only `quarter === CURRENT_QUARTER` sessions. Historical
quarters stay in the database but are never rendered. Students are
further scoped to **their own group's people** (see Student Self-Service).

## Instructor View

Sections by group (current-quarter groups, 未分組 last). Each group gets a
table — weeks as rows (date + weekday), 主領 and 觀察 columns as editable
chips scoped to that group's members. A member can appear as 主領 in one
week and 觀察 in another; the same week's 主領/觀察 candidates exclude
anyone already assigned that week in either role.

## Student View

One table, weeks as rows, 主領/觀察 columns — filtered to the student's
own group's people. The student's own chips carry a remove control; empty
slots offer 我來主領 / 我來觀察. One role per student per week: adding
oneself to a role removes them from the other role of the same week.

## Derived Views (instructor roster)

主領日期 / 觀察日期 list views invert the sessions: per student, the
dates on which they lead or observe. Derived at query time — no stored
copy to drift.

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Instructor Assignments EARS](./instructor-assignments-EARS.md)
- [Student Self-Service EARS](./student-self-service-EARS.md)
