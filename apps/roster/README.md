# sgbs-roster

小組查經訓練主日學 roster app: a self-hosted replacement for the Airtable
base `appPjFf1hVqSChSyo` (table 学员名单 `tblty4DoMC2Pmfrw6`), with
self-hosted passwordless authentication (no external identity vendor) and
role-gated views.

- **Live**: <https://sgbs-training.citylight.life>
- **Frontend**: Vite + React + Tailwind (this repo, deployed on Vercel as
  project `sgbs-roster`)
- **Backend**: Convex (prod deployment `abundant-dodo-507`, dev
  `rugged-oriole-958`, team `eric-036a4`)
- **Auth**: self-hosted passwordless — registration verifies email
  ownership once via a 6-digit code (sent from the church Gmail mailbox
  via SMTP); sign-in is an email lookup.
  Sessions are app-issued ES256 JWTs (`AUTH_PRIVATE_KEY` Convex env var;
  public JWK embedded in `convex/auth.config.ts`). See
  [docs/designs/authentication/LLD.md](docs/designs/authentication/LLD.md)
- **Design system**: see [DESIGN.md](DESIGN.md) — the 和合本 scripture-page
  world, including the role model notes below
- **Design docs**: [docs/high-level-design.md](docs/high-level-design.md)
  with per-feature LLDs + EARS specs under
  [docs/designs/](docs/designs/) — the design-driven-development record of
  the role model, registration modes, grouping algorithm, schedule
  self-service, and directory scoping

## Roles and views (the core intent)

There are exactly three experiences. The role is derived server-side on
every request: an email is an instructor if (and only if) it is an **active
row in the Convex `instructors` table**; everyone else signed in is a
student; anything else is a guest.

### What each role sees

- **註冊 registration** — Guest: sign-in prompt only. Student: the form
  with an email-verification step. Instructor: admin mode — register other
  people (editable email), with the 登記另一位 loop for back-to-back
  sign-ups.
- **我的組 my group** — Student only: own group mates with names, photos,
  and contact info, plus the editable group name. Instructor: never (not
  their surface).
- **聯絡表 directory** — Student: current season only, no quarter filter.
  Instructor: full archive with a quarter filter.
- **課堂安排 schedule** — Student: own group's people only, four leading
  weeks, self-serve 我來主領/我來觀察. Instructor: every group's table
  with full assignment editing.
- **名單 full roster** — Instructor only: all 12 views.
- **分組 group divider** — Instructor only: one-click diverse grouping
  with manual override and renames.

Intent rules that must survive refactors:

1. **Students see their own world only.** A student never sees another
   group's people (schedule and directory are group/season-scoped
   server-side, not just hidden in the UI), never sees past seasons in the
   directory, and never sees the full roster.
2. **Students edit only themselves.** In 課堂安排 a student can add or
   remove their own name as 主領/觀察 for any of the four leading weeks —
   never anyone else's. Adding one role for a week removes them from the
   other role that week.
3. **Groups are self-naming.** Any member can rename the group (點擊組名);
   the rename sweeps every member that season. Groups start as
   第1組/第2組/... from the one-click divider and get real names on day one
   of class.
4. **The instructor is the editor of last resort.** The instructor
   課堂安排 shows every group's table with full assignment editing, and
   分組 runs the one-click diversity divider (fellowship, gender, baptism
   era, leading experience) with manual override and renames. Dates are
   fixed at five classes; the first class is orientation and never carries
   assignments, so each season has exactly **four leading weeks**.
5. **Registration has two modes.** Students register themselves: the
   form collects the email and a 6-digit code sent to it proves ownership
   (sign-in is then that email, codeless). Instructors register other
   people: same form, editable email, they vouch for the address, and the
   flow repeats via 登記另一位.
6. **Instructor status is data, not code.** Activate/deactivate an
   instructor by flipping their row in the `instructors` table (one Convex
   run command) — no deploy. Currently active: Eric Ma and 林意 — the literal
   addresses live only in the Convex `instructors` table (this repo is
   public, so member emails are never committed).

Enforcement lives in `convex/students.ts` (`requireInstructor`,
`requireCurrentStudent`) — the UI hiding tabs is convenience, the server
is the gate.

## Field-name note

Convex requires ASCII field names, so documents use English keys
(`name`, `fellowship`, `email`, `baptismTime`, `quarter`, `groupName`,
`gender`, `leadingExperience`, `present`, `missed`,
`photoStorageId`); the UI shows the original Chinese labels.

Leading/observing assignments live only in the `sessions` table
(`leaderIds`/`observerIds`); the per-student views derive them at
query time, so there is no second copy to drift. The legacy
per-student assignment arrays were reconciled into sessions and
dropped (`migrations:reconcileAssignments`), surfacing real class
dates the calendar had lacked (e.g. 2023春季 ran Feb-Mar).

Attendance (出勤) lives in the `attendance` table: one row per
(student, class date), written through `students:recordAttendance`,
which validates that the date is an active session date of the
student's quarter — attendance can never point at a non-class day. A
quarter's active dates are its rows in the `sessions` table (4-6
variable weeks, gaps allowed). Quarters whose dates Airtable never
recorded were reconstructed: 2022秋季-2026春季 are aligned to the
course website's 錄影 page (authoritative dates, via
`migrations:alignCalendarsToRecordings`), and the four older seasons
without recordings (2015/2016 fall, 2020 fall, 2021 spring) carry
`estimated: true` (first five Sundays of April/October). `missed` is the replicated absent count, maintained at write
time. Instructors are never students in the current quarter: enforced
at both registration paths and by the backfill migration.

For legacy seasons, unrecorded classes were backfilled as explicit
absences (`migrations:backfillLegacyAbsences`) — Airtable's unchecked
課堂 box meant absent, and the Missed formula counted it. In the
current quarter, classes that haven't been marked stay unrecorded.

Dropped in the 2026-09-05 cleanup: the homework columns
(功课（提交）→`homeworkSubmitted`, 功课提交数目→`homeworkCount`), the
scalar 带领日期/观察的日期, `source`, and
`teachingAssistants` — all stripped from existing rows by
`migrations:cleanupStudentFields`. The same migration sets `present`
to true on every row and backfills `class1`-`class5` = true (with
`missed` = 0) for rows whose five attendance marks were all blank.
The never-filled `bookOrder` (Airtable 书本订购) was dropped the same
day.

There is a single creation-time column: the system `_creationTime`.
The old `createdTime` string column was dropped by exporting the
table, rewriting each document's `_creationTime` from its true
`createdTime` value (Airtable-era rows) and re-importing with
`npx convex import --table students --replace` (document ids are
preserved, so session assignments stay wired). `transform_seed.py`
emits `_creationTime` directly. Audit any deployment with
`npx convex run migrations:verifyStudents [--prod]`.

## Local development

```bash
npm install
npx convex dev        # pushes functions to the dev deployment, watches
npm run dev           # Vite dev server (reads VITE_CONVEX_URL from .env.local)
```

`VITE_CONVEX_URL` lives in `.env.local` (`convex dev` writes it). The
auth stack needs `SMTP_USER` + `SMTP_PASS` (verification-code emails via
Gmail SMTP; `SMTP_PASS` is a Google App Password) and `AUTH_PRIVATE_KEY`
(session-JWT signing) set on BOTH Convex deployments — secrets via
`npx convex env set`, never in the repo.

## Redeploying

```bash
npx convex deploy     # push functions to prod (confirm the Y/n prompt)
vercel deploy --prod  # build + ship the frontend
```

CI (`.github/workflows/roster.yml`, added 2026-09-05; same-day upgrade
to per-branch Convex preview deployments): the Vercel build command runs
`npx convex deploy --cmd 'npm run build'` (see `apps/roster/vercel.json`),
so Convex functions and the frontend always deploy together.

- **Push to master** (touching `apps/roster/`) → Vercel production
  deploy: pushes functions to prod, then builds + ships the frontend
  pointing at prod.
- **PRs touching `apps/roster/`** → Vercel preview deploy with the URL
  commented on the PR. Each preview gets a **per-branch isolated Convex
  preview deployment** running the PR's functions. Fresh preview backends
  are seeded from the project's **default env vars for preview
  deployments** (`npx convex env default --type preview`: SMTP_USER,
  SMTP_PASS, AUTH_PRIVATE_KEY) so the auth flow works — but their data
  is throwaway and registration emails from a preview really send.

Deploy keys live as Vercel project env vars (`CONVEX_DEPLOY_KEY`:
Production target = prod key, Preview target = preview key). Other
secrets (GitHub repo): `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`.

Manual fallback: `npx convex deploy` + `vercel deploy --prod` from
`apps/roster/`.

## Migration pipeline (airtable_dump/ at repo root)

One-time-ish scripts for re-dumping and re-importing the Airtable data:

```bash
# 1. Dump base schema + all tables (token from ~/.airtable/cli.json)
uv run airtable_dump/dump_airtable.py

# 2. Transform 学员名单 into Convex-ready seed docs (ASCII keys, resolved
#    links, true _creationTime, replicated Missed field + verification
#    report)
uv run airtable_dump/transform_seed.py
cp airtable_dump/students_seed.jsonl apps/roster/seed/students_seed.jsonl

# 3. Import (add --prod for production), then run the cleanup migration
cd apps/roster && npx convex import --table students seed/students_seed.jsonl
npx convex run migrations:cleanupStudentFields
```

## Known limitations

- Spam protection (rate limiting / CAPTCHA) is not yet included on the
  public registration form (rate limiting exists on code requests).
- Airtable's API does not expose view *configurations* (filters, sorts,
  hidden columns), so each view's filter was reimplemented from its name
  and semantics. Tune the queries in `convex/students.ts` if the original
  view differs.
- Group assignment to students (who goes in which group) is still a Convex
  run command; the instructor UI covers the divider but not manual
  per-student group edits yet.
- Sign-in is an email lookup (no secret). Documented exposure: anyone who
  knows a registered member's address can view that group's contact
  sheet — an accepted tradeoff for this deployment; revisit if the app
  ever holds more sensitive data.
- Codes are sent from the church mailbox `no-reply-com@cbcgb.org` via
  Gmail SMTP with a Google App Password (login passwords are refused).
  If sends start failing with auth errors, re-create the app password
  (myaccount.google.com/apppasswords); a Google Workspace admin can also
  disable app passwords org-wide. Gmail caps sends at ~2,000
  recipients/day (Workspace) — far above this app's volume.
