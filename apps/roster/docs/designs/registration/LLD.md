# Registration — Low-Level Design

**Created**: 2026-08-30
**HLD Link**: ../../high-level-design.md

## Overview

One form component, two modes. The form is a faithful reimplementation of
the Airtable form view 小组查经训练注册 (shrS5gKu57LudKDSh): 名字, 性別,
團契, 郵箱, 受洗時間, 帶領查經經驗, 課堂出席 confirmation — plus an
optional photo. What differs is who the email belongs to.

## Two Modes

### Self mode (students)

The Clerk identity owns the email. It renders as ruled text (not an
input) — identity-authoritative, so a student can only ever register
themselves. The name is prefilled from the Clerk profile and stays
editable (profiles often hold English names; students may prefer Chinese).

### Admin mode (instructors)

The instructor registers someone else: 郵箱 becomes a required editable
input, the name starts empty, and the submission carries that email.
After success the success panel offers 登記另一位, which resets the whole
sheet for back-to-back sign-ups at the door.

## Data Flow

```text
POST photo → Convex storage → storageId
mutation registerStudent({
  name, gender, fellowship, baptismTime,
  leadingExperience, confirmedAttendance,
  quarter, photoStorageId, [email — admin mode]
})
server: email := args.email (instructor) | identity.email (self)
duplicate guard: same email + quarter → duplicate
insert with missed: 0 (attendance starts unrecorded)
```

## Field Constraints

| Field | Rule |
| ----- | ---- |
| email | format check; duplicate guard per quarter |
| 所有必填 | missing → 缺少必填欄位 error (Chinese, server-side) |
| photo | image only; downscaled to max 720px JPEG client-side |
| 組名 rename | non-empty, ≤ 20 chars (renameMyGroup) |

## Photo Upload

One-hour single-use upload URL (`generateUploadUrl` mutation); the client
POSTs the file, receives a storageId, and passes it with the registration.
The preview uses an object URL revoked on change/unmount. Students can
snap (capture="user" — front camera) or pick from the gallery.

## Error Handling

Chinese server messages pass through verbatim; anything else (network,
internals) collapses to a single recovery line so raw English internals
never reach a Chinese-language form.

## Edge Cases

- **Already registered**: same email + quarter returns status duplicate →
  UI shows 已註冊 with a recovery line (聯絡同工), not a second record.
- **New registrations start at missed: 0** — "5" meant attendance was
  never recorded, never "missed everything" (Eric: out at ~3).
- **Instructor registering a duplicate** still returns duplicate, never a
  second row.

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Registration EARS](./registration-EARS.md)
- [Photo Upload EARS](./photo-EARS.md)
