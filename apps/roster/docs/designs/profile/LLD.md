# Student Profile (我的資料) — Low-Level Design

**Created**: 2026-09-05
**HLD Link**: ../../high-level-design.md

## Overview

A student-facing view/update surface for the registration record. The tab
renders the same ruled ledger as the registration sheet (Form.tsx): view
is the resting state; 更新資料 lifts the registrable fields into the same
ruled inputs. Extends the "students edit only themselves" intent rule —
previously that meant 主領/觀察 self-service only; now it also covers
their own particulars and photo.

## Backend (convex/students.ts)

- **`myProfile`** — query, gated on the session identity. Returns the
  student's own current-quarter row plus the photo URL. No
  client-supplied student id anywhere.
- **`updateMyProfile`** — mutation, gated by `requireCurrentStudent`.
  Updates the five registrable fields; trimmed non-empty (缺少必填欄位).
- **`updateMyPhoto`** — mutation, gated by `requireCurrentStudent`. Sets
  or clears `photoStorageId`; deletes the previous blob.

Out of scope by design: email (identity-authoritative — sign-in is that
email), 小組/季度/出勤 (instructor territory, intent rule 4). The
instructor keeps full edit power through the roster/data model; the
instructor rule keeps active instructors out of the students table, so
their own 我的資料 tab shows 本季度尚未登記 — correct, not a bug.

## Data Flow

```text
myProfile → { registered, student{...}, photoUrl }
保存:
  photo picked → generateUploadUrl → POST → storageId
             → updateMyPhoto({storageId})  (old blob deleted server-side)
  → updateMyProfile({name, gender, fellowship, baptismTime, leadingExperience})
```

## UI

`src/MyProfile.tsx` mirrors Form.tsx's design system: RuledField /
RuledSelect / ruledInput, vermilion 保存 button, gold-bordered 尚待補齊
notice for missing fields (photo counts as missing — the nudge to
self-serve what registration left blank). 郵箱 and 小組 render as
RuledValue ruled text with notes explaining who governs them.

## Related Documents

- [Profile EARS](./profile-EARS.md)
- [Registration LLD](../registration/LLD.md) — the source form and photo
  pipeline this surface mirrors.
