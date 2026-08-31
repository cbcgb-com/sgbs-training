# Photo Upload — EARS

**Parent LLD**: ./LLD.md

## Capture & Preview

- [x] **REG-PHOTO-001**: The system shall offer 拍照 (front camera,
      capture="user") and 從相簿選擇 (gallery) inputs.
- [x] **REG-PHOTO-002**: When a photo is chosen, the system shall show a
      circular preview with a 重新選擇 reset control.
- [x] **REG-PHOTO-003**: If the chosen file is not an image, then the
      system shall reject it with 請選擇照片檔案。.

## Processing & Storage

- [x] **REG-PHOTO-010**: The system shall downscale images to a 720px long
      edge and re-encode as JPEG before upload.
- [x] **REG-PHOTO-011**: The system shall upload through a one-hour
      single-use Convex storage upload URL and pass the storageId with the
      registration.
- [x] **REG-PHOTO-012**: The system shall label the field optional and
      note 僅供小組同工使用.

## Display & Cleanup

- [x] **REG-PHOTO-020**: The roster shall render a student's photo as a
      circular avatar; students without one render the serif initial.
- [x] **REG-PHOTO-021**: When a student record is deleted, the system
      shall delete the stored photo blob.

## Related Documents

- [Registration LLD](./LLD.md)
