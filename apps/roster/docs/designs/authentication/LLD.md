# Authentication & Roles — Low-Level Design

**Created**: 2026-08-30
**HLD Link**: ../../high-level-design.md

## Overview

Clerk provides identity (Google or email-code sign-in); Convex validates
the JWT and derives the role server-side. There is no client-side role
concept — every query and mutation enforces its own gate.

## Role Derivation

An identity's email maps to a role in this order:

1. **Instructor** — an `instructors` table row with the same email AND
   `active: true`.
2. **Student** — otherwise, when a `students` row exists with that email
   and `quarter === CURRENT_QUARTER`.
3. **Authenticated guest** — signed in, no student record.

Helpers in `convex/students.ts`: `requireAuth`, `requireInstructor`
(active instructor or throws 僅限同工存取), `requireCurrentStudent`
(registered this quarter or throws 請先註冊本季課程).

## Data Models

### instructors

| Field | Type | Description |
| ------- | ------ | ------------- |
| email | string | Identity email, indexed by_email |
| name | optional string | Display name |
| active | optional boolean | Only `true` grants access |

Currently active: Eric Ma's two accounts (gmail + Google) and
林意's gmail. The 14 inactive rows are the Teachers migrated from
Airtable — kept for history, no access. Literal addresses live only in
the Convex `instructors` table, never in this repo (it is public).

## Functions

- `me` (query) — auth; returns isInstructor + student summary
- `directory` (query) — auth; students scoped to current season
- `saveGroups`, `renameGroup`, `createSession`, `deleteSession`,
  `updateSessionAssignments` (mutations) — requireInstructor
- `registerStudent`, `addMeToSession`, `removeMeFromSession`,
  `renameMyGroup` (mutations) — requireAuth (+ registered for
  self-service)
- `setActiveInstructors`, `seedInstructors`, `wireSessionAssignments`,
  `assignGroup`, `deleteSessionByDate`, `fixFalseMissed`
  (internalMutations) — CLI only (`npx convex run`)

## Token Configuration

`convex/auth.config.ts` points at the Clerk dev instance
(`quick-treefrog-3653.clerk.accounts.dev`, applicationID `convex`). The
Clerk JWT template `convex` carries aud `convex` plus name / given_name /
family_name / email / picture claims — `ctx.auth.getUserIdentity()` reads
email and name from those claims.

## Edge Cases

- **Two Eric accounts**: the Gmail test account and the real Google
  account are separate Clerk users. Only the Gmail account was an
  instructor until 2026-08-30, when the real account was added. Roles are
  per-email — never assume "Eric is admin" without checking which email.
- **Inactive, not deleted**: deactivating an instructor keeps their row;
  set `active` back to restore access.
- **Student + instructor on one email**: instructor gate wins for viewing;
  the student record still exists (e.g. Eric's 約書亞小組 registration).

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Roles & Gating EARS](./roles-EARS.md)
