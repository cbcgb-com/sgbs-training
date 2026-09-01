# sgbs-roster

小組查經訓練主日學 roster app: a self-hosted replacement for the Airtable
base `appPjFf1hVqSChSyo` (table 学员名单 `tblty4DoMC2Pmfrw6`), with
self-hosted passwordless authentication (no external identity vendor) and
role-gated views.

- **Live**: <https://sgbs-roster.vercel.app>
- **Frontend**: Vite + React + Tailwind (this repo, deployed on Vercel as
  project `sgbs-roster`)
- **Backend**: Convex (prod deployment `abundant-dodo-507`, dev
  `rugged-oriole-958`, team `eric-036a4`)
- **Auth**: self-hosted passwordless — registration verifies email
  ownership once via a 6-digit Resend code; sign-in is an email lookup.
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
`gender`, `leadingExperience`, `present`, `class1`-`class5`, `missed`,
`homeworkSubmitted`, `homeworkCount`, `photoStorageId`, `source`); the
UI shows the original Chinese labels. Linked-record fields
were resolved to display values at import time (主领日期/观察日期 →
课程日期, 功课（提交） → 功课, 助教 → 教师). The Airtable `Missed` formula
(unchecked classes, 1-5) and `功课提交数目` count are replicated at
write time and verified to match all 284 migrated records.

## Local development

```bash
npm install
npx convex dev        # pushes functions to the dev deployment, watches
npm run dev           # Vite dev server (reads VITE_CONVEX_URL from .env.local)
```

`VITE_CONVEX_URL` lives in `.env.local` (`convex dev` writes it). The
auth stack needs `RESEND_API_KEY` + `RESEND_FROM` (verification-code
emails) and `AUTH_PRIVATE_KEY` (session-JWT signing) set on BOTH Convex
deployments — secrets via `npx convex env set`, never in the repo.

## Redeploying

```bash
npx convex deploy     # push functions to prod (confirm the Y/n prompt)
vercel deploy --prod  # build + ship the frontend
```

Per Eric (2026-08-30): **do not deploy prod by hand** — wire GitHub CI so
PRs get preview deploys and merges to main auto-deploy prod. This is set
up as `.github/workflows/*` at the repo root; secrets live on the GitHub
repo. Until that lands, preview deploys go through `vercel deploy`
(non-prod) and prod stays pinned to the last merged state.

## Migration pipeline (airtable_dump/ at repo root)

One-time-ish scripts for re-dumping and re-importing the Airtable data:

```bash
# 1. Dump base schema + all tables (token from ~/.airtable/cli.json)
uv run airtable_dump/dump_airtable.py

# 2. Transform 学员名单 into Convex-ready seed docs (ASCII keys, resolved
#    links, replicated Missed/count fields + verification report)
uv run airtable_dump/transform_seed.py
cp airtable_dump/students_seed.jsonl apps/roster/seed/students_seed.jsonl

# 3. Import (add --prod for production)
cd apps/roster && npx convex import --table students seed/students_seed.jsonl
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
- Resend's dev sender (`onboarding@resend.dev`) only delivers to the
  Resend account owner's address; verify a sending domain in the Resend
  dashboard (DNS records) and set `RESEND_FROM` before opening
  registration to the congregation.
