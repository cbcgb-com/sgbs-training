# Withdrawal (退出報名) — Low-Level Design

**Created**: 2026-09-17
**HLD Link**: ../../high-level-design.md

## Overview

A student who registered for a quarter had no way to leave the class. Their
row kept them in every roster view, the directory (聯絡表), their group
(我的組), and the schedule — forever. Withdrawal (退出報名) adds an exit
door without destroying the quarter's record.

Withdrawal is a **derived membership status**, plus an optional manual
soft flag. Manual `withdrawnAt` (the original 退出報名 write) still
means withdrawn. From **2026秋季** on, any two misses of that quarter's
session dates also withdraw the student, immediately, without writing
`withdrawnAt`. Earlier quarters keep the flag-only behaviour.

A miss is an explicit 缺席 (`attended: false`) **or** a session date
strictly before today in America/New_York with no attendance row. A
blank on a past date is a miss. Today (and future dates) with no row
is not a miss. There are no excused absences, makeups, book-reflection
makeups, or orientation exceptions — all five lessons count. Late
registrants' earlier blank lessons count as misses. If a future quarter
lists more than five dates, the threshold stays two misses.

Status is always computed (`src/attendanceStatus.ts`) from
`withdrawnAt` + the quarter's session dates + attendance rows + today's
NY date. Queries must not call `Date.now()` for that date: an hourly
cron writes `appMeta.todayNy`, and mutations refresh it, so Convex
queries re-run when the calendar day rolls. Tests may set
`todayNyOverride`.

Correcting a miss to 出席 drops the miss count; below two, the student
is active again. Re-registration cannot undo an absence withdrawal.
Instructor 復原 only clears `withdrawnAt`.

This preserves the quarter's attendance history, keeps sign-in coherent
(the email still resolves to a row), and makes returning *manually*
withdrawn students a reactivation rather than a second ambiguous row.

## Why not hard delete

`students:deleteStudentByEmail` (CLI) already deletes a row. It is the
wrong shape for withdrawal: it destroys the quarter's attendance history,
leaves no record the person ever enrolled, locks a first-quarter-only
student out of sign-in entirely (sign-in is an email lookup over student
rows), and conflates "left the class" with "purge the record." It stays
available as the genuine record-deletion path.

## Data Model

Two optional columns on `students`:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `withdrawnAt` | optional number | epoch ms; presence = withdrawn |
| `withdrawnReason` | optional string | optional reason captured at withdrawal |

No new index: existing queries narrow by `by_quarter` (or collect), and the
table is small.

## Withdrawal flows

### Student self-service (`students:withdrawFromQuarter`)

Gated by `requireCurrentStudent`. Steps:

1. `patch(me._id, { withdrawnAt: Date.now(), withdrawnReason,
   groupName: undefined })`.
2. **Sweep the student out of every current-quarter session's
   `leaderIds`/`observerIds`** — otherwise 課堂安排 shows a ghost 主領/觀察
   after they leave. Only the current quarter is swept; historical
   assignments remain as history.
3. Attendance rows and the `missed` count are left untouched — historical
   record.

Because `requireCurrentStudent` rejects a withdrawn row, a second
self-service attempt is impossible by construction: the gate answers
請先註冊本季課程 (the member has left, so "withdraw again" is not a valid
member action). The UI never offers the action in the 已退出 state. The
idempotence handling (`{ status: "already" }`) therefore only applies to
the instructor path below.

Clearing `groupName` means the group divider and 我的組 exclude them
naturally, and a reactivated student re-enters the pool as 未分組 (they are
placed again by the instructor).

The reason is optional and captured at withdrawal time. Form factor (LLD
decision): a single dropdown with the common reasons
(`時間無法配合`, `課程內容與期待不同`, `個人因素`, `其他`) plus a free-text
box revealed when 其他 is chosen; the whole field may be left blank
(選填). The stored value is one plain string, so the shape can change
without a migration.

### Instructor on-behalf (`students:withdrawStudent`)

Instructors mark someone withdrawn in person (they said so at class). Same
soft-state write and same session sweep, addressed by `studentId`; it is
not limited to the current quarter (an instructor may tidy a historical
row), but the session sweep is always current-quarter. The actor is
recorded implicitly by the withdrawal timestamp; there is no separate
actor column (the roster table has no audit columns, and adding one is out
of scope).

### Instructor undo (`students:reactivateStudent`)

The issue's reactivation path is re-registration. An instructor-side undo
is a small addition beyond the issue (flagged here): without it, an
accidental on-behalf withdrawal is only recoverable by the student
re-registering. It clears `withdrawnAt`/`withdrawnReason` and leaves the
row otherwise as-is (groupName stays cleared; sessions stay swept). Scope:
instructor-only, addressed by `studentId`.

## Re-registration = reactivation

Both registration paths treat "duplicate" as same email + same quarter. A
withdrawn duplicate must not dead-end the returning student, so each path
reactivates instead of inserting:

- **`auth.verifyRegistrationCode`** (self-registration): if the same-quarter
  duplicate has `withdrawnAt !== undefined` → patch the row active
  (`withdrawnAt: undefined`, `withdrawnReason: undefined`), refresh the
  registration fields from the new submission, replace the photo when a new
  one was uploaded (deleting the previous blob), schedule
  `sendWelcomeEmail`, and return status `"reactivated"`.
- **`students.registerStudent`** (instructor-managed): same treatment,
  same welcome email.

Returning for a **new quarter** is already a new row by design — no change.

Client-side, `"reactivated"` renders the same 謝謝 success panel as
`"created"` (the student is signed in either way). `Form.tsx` needs no new
result state: the self-registration path (`CodeStep`) uses only the
returned `codeIssuedAt` to mint the session, and the instructor path maps
any non-`duplicate` status to the created panel — so `"reactivated"` and
`"created"` land on identical UI, while `"duplicate"` keeps the 已註冊 copy.

Consequence to note: the sweep means a withdraw-then-reactivate loses that
quarter's *assigned* 主領/觀察 weeks (attendance history is kept). This is
the intended reading of "they left and came back" — the instructor
re-assigns.
Repeated withdrawal is a no-op that never overwrites the recorded reason or
date; it still re-runs the sweep, so a malformed client that re-added the
student to a session cannot leave a ghost assignment.

## Absence-withdrawal side effects

When a write (explicit 缺席, or clearing a past 出席 so the date becomes
a blank miss) takes the derived count to two, `maybeApplyAbsenceWithdrawal`
clears `groupName` and sweeps current-quarter 主領/觀察 — the same
cleanup as manual withdrawal. Blanks that become misses at midnight NY
are picked up by the hourly `attendanceStatus:dailySweep` (writes
`todayNy`, then sweeps). Becoming active again does **not** restore the
group or assignments; the instructor re-seats them.

Sitting in after the 2nd miss is allowed in the room but never recorded:
`recordAttendance` rejects `attended: true` on a date after the 2nd miss
(旁聽不記錄出席). Corrections on or before the 2nd miss date stay
allowed.

TODO(groups-under-3): after an absence-withdrawal removes someone from a
group, check whether that group now has fewer than 3 active members and
trigger the follow-up flow. Designed separately; do not implement here.

## View sweep — withdrawn rows are invisible to current-quarter surfaces

Every current-quarter surface filters derived `withdrawn` (manual flag
**or** two misses from 2026秋季 on), not `withdrawnAt === undefined`
alone:

| Surface | Function | Treatment |
| ------- | -------- | --------- |
| 本季度 | `byQuarter` | exclude withdrawn |
| 出勤 | `quarterAttendance` | manual excluded; absences in `withdrawnByAbsence` |
| 看板 | `grouped` | exclude withdrawn |
| 分組儲存 | `saveGroups` | skip withdrawn rows |
| 分組改名 | `renameGroup` | exclude withdrawn |
| 我的資料 | `myProfile` | report `withdrawn: true` (see UI) |
| 我是誰 | `me` | `student: null` when withdrawn |
| 我的組 | `myGroup` | `registered: false` when withdrawn |
| 聯絡表 | `directory` | exclude withdrawn |
| 自助守門 | `requireCurrentStudent` | reject with 請先註冊本季課程 when withdrawn |
| 名單 Master | `all` | **keep** withdrawn rows (history), badge in UI |
| 已退出 | `withdrawn` (new) | withdrawn rows only, for the dedicated view |

The derived history views (`withExperience`, `leaders`, `observers`) are
left as-is, exactly like Master: they span all quarters and exist to retain
history. `leaders`/`observers` are session-derived, so the current-quarter
sweep removes a withdrawn student's current-quarter rows there (historical
dates remain). `withExperience` keys on the `leadingExperience`
registration field, not on assignments, so a withdrawn student who has
led before still appears in 帶領經驗 (with an empty 帶領日期 for the
current quarter) — that is the intended history retention, not an
oversight.

## UI

### 我的資料 (MyProfile.tsx)

- Resting student view gains a 退出本季課程 action (a quiet vermilion text
  control, not a competing primary button) that opens an inline
  confirmation strip: the effect copy
  「退出後，您的名字將從本季名單、聯絡表、小組與課堂安排中移除；出席紀錄會保留。如想重新加入，可重新提交註冊。」
  plus the optional reason dropdown + free text, then 確認退出 / 取消.
- After withdrawal the tab renders a distinct 已退出 state — headline 已退出,
  the effect copy, the recorded reason if any, and a 重新報名 button that
  switches to the 註冊 tab.
- `myProfile` returns `withdrawn: true` + `withdrawnAt` + `withdrawnReason`
  so the state is server-derived, never guessed client-side.

### App chrome (App.tsx)

`me` returns `student: null` for a withdrawn student, so the 註冊 tab
renders the normal self-registration form (the 重新報名 path) and no other
student surface treats them as an active member. Tabs themselves are
unchanged — a withdrawn student keeps the student tabs and simply sees the
unregistered state on each.

### Roster (Roster.tsx)

- New view **已退出** in the chapter-tab nav (instructor-only surface),
  listing withdrawn students with quarter, reason, and withdrawal date,
  plus a quarter filter (全部 + each quarter present).
- **已退出 badge** next to the name on withdrawn rows in Master View (and
  any other view that keeps them).
- Instructor withdrawal controls: 本季度 view rows get a 標記退出 control
  (inline confirm strip with the same optional reason), and the 已退出
  view rows get a 復原 control (reactivate).

## Error Handling

Chinese server messages pass through verbatim; all guards reuse the
existing `請先登入` / `僅限同工存取` / `請先註冊本季課程` messages. Nothing
new is needed for the UI's error line.

## Edge Cases

- **Already withdrawn, withdraws again** — idempotent `{ status: "already" }`.
- **Withdrawn student withdraws from a different tab mid-flight** —
  `requireCurrentStudent` rejects; the UI shows 請先註冊本季課程.
- **Instructor withdraws an already-withdrawn row** — idempotent, same
  write; no double timestamps (only set when currently active).
- **Reactivation with a new photo** — the previous blob is deleted so
  photos don't accumulate (same cleanup as `updateMyPhoto`).
- **Reactivation without a new photo** — the stored photo is kept.
- **Attendance untouched** — `missed` and `attendance` rows stay; a
  reactivated student's 缺課 view is continuous.
- **Historical rows** — withdrawal is normally a current-quarter act; the
  instructor mutation may target any row, but the session sweep is always
  current-quarter.

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Withdrawal EARS](./withdrawal-EARS.md)
- [Registration LLD](../registration/LLD.md) — the inverse operation;
  reactivation rides its duplicate path
- [Authentication LLD](../authentication/LLD.md) — sign-in stays an email
  lookup, which is why the row must survive
