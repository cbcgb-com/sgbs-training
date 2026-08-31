# Registration — EARS

**Parent LLD**: ./LLD.md

## Form (self mode, signed-in student)

- [x] **REG-FORM-001**: The system shall render 名字, 性別, 團契, 郵箱,
      受洗時間, 帶領查經經驗, and 課堂出席 in that order.
- [x] **REG-FORM-002**: The system shall prefill 名字 from the Clerk
      profile and render 郵箱 from the identity as non-editable text.
- [x] **REG-FORM-003**: The system shall mark all seven original fields as
      required (＊) with the Airtable help texts preserved.

## Submission

- [x] **REG-SUB-001**: When the student submits, the system shall take the
      email from the signed-in identity, never from client input.
- [x] **REG-SUB-002**: When the same email is already registered for the
      same quarter, the system shall return duplicate and render the
      已註冊 panel instead of creating a record.
- [x] **REG-SUB-003**: When registration succeeds, the system shall record
      missed = 0 (attendance starts unrecorded) and source = "form".
- [x] **REG-SUB-004**: If any required field is missing, then the system
      shall reject the mutation with a Chinese field message.
- [x] **REG-SUB-005**: When a non-instructor submits an email argument,
      the system shall ignore it and use the identity email.

## Admin Mode (instructor)

- [x] **REG-ADM-001**: Where the submitter is an active instructor, the
      system shall accept an email argument and register that person.
- [x] **REG-ADM-002**: When an instructor submits an invalid email, then
      the system shall reject it with 請填寫有效的電子郵箱.

## Success & Errors

- [x] **REG-UI-001**: When registration succeeds, the system shall render
      the 謝謝 colophon with 提摩太後書二章十五節.
- [x] **REG-UI-002**: Where the submitter is an instructor, the system
      shall offer 登記另一位 to reset the form for the next person.
- [x] **REG-UI-003**: If the server returns an error, then the system
      shall render Chinese messages verbatim and collapse all other
      errors into one recovery line.

## Related Documents

- [Registration LLD](./LLD.md)
