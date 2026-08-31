# SGBS Roster — High-Level Design

**Created**: 2026-08-30
**App**: `apps/roster/` in the sgbs-training repo

## Problem Statement

The church's 小組查經訓練主日學 (small-group Bible study training) ran its
roster, registration, and scheduling out of an Airtable base. The church
did not control the data, could not shape the experience, and the generic
grid did not match how the training actually works: groups take turns
leading and observing, and every season starts with a paper-like sign-up.
We replaced it with a self-hosted app the church owns, designed for two
very different users: students who register and see only their own group,
and instructors who manage everything.

## Goals

1. **Own the data** — all 284 historical students live in our own Convex
   database, with the Airtable record preserved as a migration source.
2. **Self-service registration** — students sign in and register with
   minimal typing; name and email come from their identity.
3. **Self-service scheduling** — on day one, each group fills in its own
   主領/觀察 names for the four leading weeks, in real time, with zero
   instructor data entry.
4. **Instructor clarity** — 同工 see the full roster, all 12 original
   views, and edit assignments; students never do.
5. **Dignified design** — the 和合本 scripture-page visual world, not a
   generic admin grid.

## Non-Goals

- **Spam protection** — rate limiting / CAPTCHA on the public form is
  deferred; the Airtable form had none either.
- **Attendance editing UI** — class checkmarks are migrated data; an
  instructor attendance editor is future work.
- **Instructor UI for per-student group assignment** — the divider is the
  primary path; manual per-student moves are a CLI command today.
- **Production Clerk instance** — running on a development instance until
  the dashboard wizard is run.
- **Past-season browsing for students** — students see the current season
  only, everywhere.

## Target Users

- **Student**: a church member registering for the season on their phone,
  then checking their group, contact sheet, and when they lead/observe.
- **Instructor (同工)**: Eric and the training teachers — curate the
  roster, divide groups, assign weekly roles.

## Architecture Overview

```text
┌────────────────────────────┐
│  Vite + React + Tailwind   │  Vercel (sgbs-roster)
│  和合本 scripture pages    │
└──────────┬─────────────────┘
           │ Clerk session → Convex JWT
┌──────────▼─────────────────┐
│  Clerk (dev instance)      │  identity: Google / email code
└──────────┬─────────────────┘
           │
┌──────────▼─────────────────┐
│  Convex                    │  students, sessions, instructors
│  role gate on every query  │
└────────────────────────────┘
```

## Key Design Decisions

### Decision 1: Clerk for identity, Convex for authorization

**Choice**: Clerk issues identity; Convex validates the JWT and derives
the role server-side on every call.
**Rationale**: Students should not need accounts created for them, and the
server — never the client — decides what a role may do. An email is an
instructor only while its row in the `instructors` table has
`active: true`, so instructor status is data, not code.

### Decision 2: Registration identity comes from Clerk

**Choice**: Self-registration takes the email from the signed-in identity
(locked in the UI); instructors can register other people by supplying an
email (admin mode).
**Rationale**: A student can only ever register themselves, an instructor
can register someone at the door, and nobody can impersonate an email.

### Decision 3: Season scoping

**Choice**: Students see the current season everywhere — directory,
schedule, group. Instructors see the full archive.
**Rationale**: Students have no use for 2015 data, and the current season
is what they act on. Instructors retain history for continuity.

### Decision 4: Fixed dates, four leading weeks

**Choice**: Each season has five fixed class dates; the first is
orientation (課程信息介紹) and never carries assignments. The schedule is
exactly four leading weeks. No add/delete date UI.
**Rationale**: The dates are set once per season; inventing and deleting
dates from the UI invites drift.

### Decision 5: Groups self-organize on day one

**Choice**: The instructor's one-click divider proposes diverse groups
(fellowship, gender, baptism era, leading experience); students then fill
in their own 主領/觀察 names and can rename their group.
**Rationale**: Removes the instructor data-entry burden and matches the
real first-day flow — everyone has a phone open.

### Decision 6: Convex requires ASCII field names

**Choice**: Documents use English keys; the UI renders Chinese labels.
**Rationale**: A platform constraint. Labels live with the UI, data stays
portable.

## Risks and Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Public form spam | Add rate limiting / Turnstile when needed |
| Clerk dev instance limits | Prod instance: wizard + config swap |
| View filters guessed | Reimplemented from names; tune in students.ts |
| Dual Eric accounts | Both documented; real account is active instructor |

## Non-Functional

- Mobile-first registration; no horizontal overflow at 390px.
- All gated queries enforce the role server-side; hiding tabs in the UI is
  convenience only.
- Real-time updates: schedule changes propagate to every open phone.

## Related Designs

- [Authentication LLD](./designs/authentication/LLD.md)
- [Registration LLD](./designs/registration/LLD.md)
- [Group Assignment LLD](./designs/group-assignment/LLD.md)
- [Schedule LLD](./designs/schedule/LLD.md)
- [Directory LLD](./designs/directory/LLD.md)
- [Roster Views LLD](./designs/roster-views/LLD.md)
