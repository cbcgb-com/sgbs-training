# Student Profile (我的資料) — EARS

**Parent LLD**: ./LLD.md

## Access

- [x] **PROF-001**: The 我的資料 tab shall appear for signed-in students
      only (instructors keep their four tabs).
- [x] **PROF-002**: When the signed-in user has no current-quarter student
      row, the system shall show 本季度尚未登記 with a 前往註冊 action.
- [x] **PROF-003**: The system shall expose a student's own record only —
      `myProfile` resolves the row by the session identity's email, so no
      student id is ever accepted from the client.

## View (resting state)

- [x] **PROF-010**: The profile shall render as the registration sheet's
      ruled ledger: 名字, 性別, 團契, 郵箱, 受洗時間, 帶領查經經驗, 小組,
      個人照片.
- [x] **PROF-011**: 郵箱 and 小組 shall render as read-only ruled text
      (email is identity-authoritative; group assignment is instructor
      territory).
- [x] **PROF-012**: When a field was never filled (or a photo was never
      uploaded), the system shall render （未填）/ 尚未上傳 instead of a
      blank line.
- [x] **PROF-013**: When any registrable field or the photo is missing,
      the system shall show a 尚待補齊 notice naming each missing item.

## Edit

- [x] **PROF-020**: 更新資料 shall lift the registrable fields (名字,
      性別, 團契, 受洗時間, 帶領查經經驗) into the same ruled inputs and
      selects the registration form uses, prefilled with current values.
- [x] **PROF-021**: Saving with an empty required field shall fail with
      the server error `缺少必填欄位：<field>` (Chinese).
- [x] **PROF-022**: One 保存 shall persist the whole sheet — particulars
      and photo ride together; 取消 discards local edits.
- [x] **PROF-023**: After a successful save the system shall return to the
      resting view with an 已更新 confirmation.

## Photo

- [x] **PROF-030**: The photo editor shall offer 拍照 (capture="user") and
      從相簿選擇, plus 移除照片 when a photo exists.
- [x] **PROF-031**: When a photo is chosen, the system shall show a
      circular preview with a 重新選擇 reset control, downscaled to 720px
      JPEG before upload (same pipeline as registration).
- [x] **PROF-032**: Replacing or removing a photo shall delete the
      previous stored blob so photos don't accumulate in storage.

## Related Documents

- [Student Profile LLD](./LLD.md)
- [Registration photo EARS](../registration/photo-EARS.md) — the shared
  capture/preview/downscale pipeline.
