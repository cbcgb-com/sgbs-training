# Roles & Gating — EARS

**Parent LLD**: ./LLD.md

## Role Derivation

- [x] **AUTH-ROLE-001**: The system shall treat an email as an instructor
      only while an `instructors` row with that email has `active: true`.
- [x] **AUTH-ROLE-002**: The system shall treat any other signed-in email
      as a student when a `students` row exists with that email and the
      current quarter.
- [x] **AUTH-ROLE-003**: The system shall derive the role on the server
      for every gated query and mutation, independent of what the UI
      renders.

## Gating Enforcement

- [x] **AUTH-GATE-001**: If an unauthenticated call reaches a gated
      function, then the system shall reject it with 請先登入.
- [x] **AUTH-GATE-002**: If a signed-in non-instructor calls an
      instructor-only function, then the system shall reject it with
      僅限同工存取.
- [x] **AUTH-GATE-003**: The system shall keep the instructor list editable
      only through Convex run commands (CLI), never through client calls.

## Role-Scoped Surfaces

- [x] **AUTH-VIEW-001**: While signed out, the system shall render only a
      sign-in prompt (single 報名 tab).
- [x] **AUTH-VIEW-002**: While signed in as a student, the system shall
      render only 註冊, 我的組, 聯絡表, and 課堂安排.
- [x] **AUTH-VIEW-003**: While signed in as an instructor, the system shall
      render 註冊 (admin mode), 分組, 名單, and 課堂安排.
- [x] **AUTH-VIEW-004**: The system shall scope a student's 聯絡表 to the
      current season and a student's 課堂安排 to their own group's people.

## Instructor Lifecycle

- [x] **AUTH-LIFE-001**: The system shall allow activating or deactivating
      an instructor by CLI command without any redeploy.
- [x] **AUTH-LIFE-002**: When an instructor is deactivated, the system
      shall keep their row for history while removing their access.

## Passwordless Sign-In

- [ ] **AUTH-PWORD-001**: The system shall issue a session JWT to any
      caller whose email matches a `students` row (any quarter) or an
      active `instructors` row, and to no one else.
- [ ] **AUTH-PWORD-002**: The system shall sign session JWTs with ES256
      and embed the public key in `auth.config.ts` as a data-URI JWKS.
- [ ] **AUTH-PWORD-003**: The system shall expire session JWTs after
      12 hours and allow sign-out to revoke the session server-side.
- [ ] **AUTH-PWORD-004**: The system shall return the same rejection for
      an unregistered email as for a malformed one (no user enumeration).

## Registration Email Verification

- [ ] **AUTH-CODE-001**: The system shall create a student row only when
      the registration email has a valid, unused, unexpired 6-digit code
      presented at submit time.
- [ ] **AUTH-CODE-002**: The system shall send codes via the Resend API
      from the deployment's configured verified sender, never from
      client code.
- [ ] **AUTH-CODE-003**: The system shall limit code requests to 3 per
      email address per 10 minutes; codes shall be single-use and expire
      after 15 minutes.
- [ ] **AUTH-CODE-004**: The system shall sign the member in immediately
      after successful code verification (registration + sign-in in one
      step).

## Identity Migration

- [ ] **AUTH-MIGR-001**: The system shall sign in pre-existing (Airtable
      or Clerk-era) members by email lookup without requiring any code.
- [ ] **AUTH-MIGR-002**: The system shall carry `students.email forward
      as the sole identity key and shall not reference external identity
      ids (clerkId) in new code paths.

## Related Documents

- [Authentication LLD](./LLD.md)