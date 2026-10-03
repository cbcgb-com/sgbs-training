# Notes for AI

Every change MUST be self-coherent with existing content. Flag any
contradictions or confusing content to me. Update AGENTS.md if needed.

## Audience & Purpose

**Target**: Bible study leaders at City Light church (Boston), affiliated with Chinese
Bible Church of Greater Boston. Content is non-denominational Sunday school material
for training leaders in:

- Inductive Bible Study method (narrative & argumentative styles)
- Leading Bible study fellowship gatherings

**Language**: Traditional Chinese (繁體中文), respectful tone for adult learners at
different experience levels.

## Content Standards

### Structure & Format

- Clear learning objectives at lesson start
- Specific, actionable homework (honor system)
- Discussion questions use `???` format
- Include reflection/application sections
- Work for both live teaching and standalone reference
- **Avoid duplication** within files unless for emphasis

### Writing Guidelines

- Balance academic rigor with practical accessibility
- Include cultural context for biblical passages
- Address language barriers with clear theological explanations
- Prioritize Chinese-language resources with working URLs
- Flag denominationally partisan resources

### Formatting

- Avoid `- **text**: description` format
- Prefer: bullet lists, prose, or tables
- Avoid "why" questions (use specific formats instead)

### Content quizzes (`.content-quiz`)

Shared engine (`docs/javascripts/content-quiz.js`, wired in `mkdocs.yml`).
Banks live in `docs/quizzes/lesson-N/<slug>.html` and embed in class notes
with a borderless iframe. **All quiz design — the three forms, adversarial
sub-agent review, option craft, placement, and verification — lives in**
`.agents/skills/sgbs-quiz-authoring/SKILL.md`. Read that skill before
authoring or editing any quiz.

### Content panels (`.content-panels`)

Shared vanilla HTML/JS pattern (`docs/javascripts/content-panels.js`, wired in
`mkdocs.yml`) for chip/tab + one-panel reveals. Use when a framework would
otherwise become a wall of prose (e.g. 三要素、OEIA 焦點).

- Markup: `.content-panels` > optional `.content-panels__intro` + two or more
  `.content-panels__panel` with `data-label="…"`
- Optional `data-label` on the root names the tablist for accessibility
- Optional `data-style="steps"` numbers the tabs for sequences
  (觀察 → 解釋 → 歸納 → 應用)
- Prefer short bullets + one `.content-panels__example` callout per panel
- Traditional Chinese; teach one lens at a time, don’t dump all panels as prose
- Inductive method acronym in this course is **OEIA**: 觀察（Observation）、
  解釋（Explanation）、歸納（Induction）、應用（Application）. Do not collapse
  into OIA, and do not gloss 歸納 as Interpretation.

### Scripture quotations (`/// scripture` shortcode)

Quoted Bible passages MUST use the custom `scripture` Markdown block
(`sgbs_training/mdx_scripture.py`, enabled in `mkdocs.yml` as
`sgbs_training.mdx_scripture`) instead of hand-written HTML, so scripture
renders consistently everywhere:

```text
/// scripture | 馬太福音28章16-20節
十一個門徒往加利利去，到了耶穌約定的山上……
///
```

- One block per passage; the reference goes in the argument after `|`;
  verse text is a plain paragraph, copied verbatim.
- Renders `<blockquote class="scripture">` with a `p.scripture__ref`
  followed by verse paragraphs; styled once, site-wide, as the 引文箋
  paper slip in `docs/stylesheets/extra.css` (light/dark via the
  `--sgbs-*` tokens).
- Inside raw-HTML containers (e.g. `expandable-card__body`), add
  `markdown="1"` to the wrapping div **and to every raw-HTML ancestor up
  to the top of the HTML block** (`expandable-card`, `expandable-cards`) —
  md_in_html never processes a marked element buried inside unmarked raw
  HTML — and keep a blank line between the div edge and each block.

### Content decks (`.content-deck`)

Shared vanilla HTML/JS pattern (`docs/javascripts/content-deck.js`, wired in
`mkdocs.yml`) for quiz-style paginated cards: one card at a time with
上一張／下一張. Use for typed inventories that should be browsed, not tabulated
(e.g. 作者可能想要傳達的信息類型).

- Markup: `.content-deck` > optional `.content-deck__intro` + two or more
  `.content-deck__card` with `data-label="…"`
- Optional `data-label` on the root names the region for accessibility
- Optional `data-index="true"` shows chip tabs for all card `data-label`
  values above the stage; highlights the active card and supports jump
- Optional `data-nav="false"` hides 上一張／下一張 (use with `data-index` for
  chip-only navigation, e.g. 文學工具)
- Prefer short prompt + one `.content-deck__example` callout per card
- Shows the full set in authored order (no random sampling)
- Traditional Chinese; keep each card scannable on its own

### Activity timeline (`.content-timeline`)

CSS-only vertical timeline for in-class workshop flows (dots + connecting
line). Styles in `docs/stylesheets/extra.css`; no extra JS.

- Markup: `.content-timeline` > one or more `.content-timeline__item`, each with
  `.content-timeline__track` (`.content-timeline__dot` + optional
  `.content-timeline__line`) and `.content-timeline__card`
- Optional `.content-timeline__item--tip` for mid-flow reminders (dashed card)
- Inside the card: optional `.content-timeline__meta` >
  `.content-timeline__duration`, then `.content-timeline__title`, then bullets
  or short prose
- Omit `.content-timeline__line` on the last item
- Set `aria-label` on the root; use `aria-hidden="true"` on the track column

## Course Structure

**Flipped classroom**: Students read beforehand, class focuses on interactive
activities and practical application. First 30 minutes = mock Bible study practice.

**Roles**:

- **主領** (Leader): Facilitates mock Bible study
- **觀察員** (Observer): Provides feedback to leader
- **其他人** (Others): Participants

**Assessment**: 4/5 sessions required. Honor system homework. Peer-to-peer feedback.
Focus on practical application over formal evaluation.

**Homework Policy**: Always prepares for next lesson, never reinforces current
lesson. Lesson 5 has no homework.

## Quality Checklist

- [ ] Accurate Scripture references
- [ ] Consistent Chinese terminology
- [ ] Clear, measurable learning objectives
- [ ] Relevant practical examples
- [ ] Aligns with inductive Bible study methodology
- [ ] No denominational bias
- [ ] Cultural sensitivity maintained
- [ ] Accurate cross-references

## Technical Standards

### Markdown Linting

**ALWAYS run `markdownlint filename.md` on ANY markdown file you edit.** Fix ALL
violations (not just new ones).

```bash
pixi global install markdownlint-cli
```

**Raw HTML Exception**: Ignore MD033 issues - HTML is present for good reasons
(e.g., visual formatting for grammatical analysis).

**MkDocs Sub-bullet Indentation**: Use 4 spaces for sub-bullet points in TOC lists
so MkDocs properly renders them as nested items. The project includes a
`.markdownlint.json` configuration file that sets MD007 to expect 4 spaces,
eliminating markdownlint warnings while maintaining proper MkDocs rendering.

### Notebooks

Use marimo notebooks for new development. Don't edit existing .ipynb files (legacy).

## Email Generator App

FastAPI + HTMX + shadcn/ui application for personalized homework emails.

**Tech Stack**: FastAPI, Jinja2, HTMX, Tailwind CSS, shadcn/ui, Modal.com deployment,
Google Drive API

**Key Files**:

- `apps/api.py` - Main FastAPI routes
- `apps/templates/template.html` - HTMX interface
- `sgbs_training/email.py` - Email composition
- `sgbs_training/docs.py` - Google Docs generation
- `sgbs_training/exercises.py` - Question/note templates
- `sgbs_training/scriptures.py` - Scripture classes

**Flow**: User selects scripture → Form submission → Google Docs creation → Email
composition → HTMX preview update

## Roster App

Self-hosted replacement for the Airtable 小组查经训练主日学 base (table
学员名单 + registration form). Live at <https://sgbs-training.citylight.life>.

**Tech Stack**: Vite, React, Tailwind CSS (V4), Convex backend; frontend on
Vercel (project `sgbs-roster`), data in Convex (prod `abundant-dodo-507`).
Auth is self-hosted passwordless (no identity vendor): registration
verifies email via a 6-digit code (Gmail SMTP, `no-reply-com@cbcgb.org`);
sign-in is an email lookup;
sessions are app-issued ES256 JWTs (`AUTH_PRIVATE_KEY` Convex env var).
See `apps/roster/docs/designs/authentication/LLD.md`.

**Key Files**:

- `apps/roster/` - App root (independent npm project)
- `apps/roster/convex/auth.ts` - Passwordless auth: code request/verify,
  session-JWT issuance, sign-out
- `apps/roster/convex/authEmail.ts` - Verification-code email sending
  (node action; Gmail SMTP via nodemailer; `SMTP_USER`/`SMTP_PASS` env
  vars)
- `apps/roster/convex/auth.config.ts` - Convex customJwt provider (public
  JWK embedded as a data URI)
- `apps/roster/scripts/make-auth-keys.py` - Generates the ES256 keypair
  (private key → Convex env var; public JWKS → auth.config.ts)
- `apps/roster/convex/schema.ts` - `students` table (ASCII field names; UI
  keeps Chinese labels) + `authCodes`/`authSessions` auth tables
- `apps/roster/convex/students.ts` - View queries (12 Airtable views) +
  `registerStudent` (instructor-managed) + role gates + 退出報名 withdrawal
  (soft state `withdrawnAt`: self-service, instructor on-behalf, undo, and
  re-registration reactivation; see
  `apps/roster/docs/designs/withdrawal/LLD.md`)
- `apps/roster/src/withdrawal.ts` - Shared withdrawal UI helpers (reason
  value, date formatting)
- `apps/roster/src/auth/` - Sign-in sheet, code-entry step, session store
- `apps/roster/src/Form.tsx` - Reimplementation of the Airtable registration
  form (shrS5gKu57LudKDSh)
- `apps/roster/src/MyProfile.tsx` - Student self-service profile 我的資料
  (view/update own record + photo, 退出本季課程 withdrawal)
- `apps/roster/src/Roster.tsx` - Grid + kanban view browser (incl. the
  已退出 withdrawal view and 標記退出 control)
- `apps/roster/src/Attendance.tsx` - Instructor attendance sheet 出席
  (per-date recording, 未記錄全部出席 bulk fill; see
  `apps/roster/docs/designs/attendance/LLD.md`)
- `apps/roster/convex/homework.ts` - 功課記錄: homework tracking
  parallel to attendance — internal agent-written mutations
  (`recordHomework` upsert via `npx convex run`, `clearHomework`),
  agent roster lookup, instructor-gated marks read; read UI in the
  課堂安排 按週次 layout (see `apps/roster/docs/designs/homework/LLD.md`)
- `apps/roster/scripts/test-homework.mjs` - End-to-end homework suite
  (drives the `npx convex run` agent entry point against a dev Convex
  deployment)
- `apps/roster/scripts/test-withdrawal.mjs` - End-to-end withdrawal suite
  (runs against a dev Convex deployment)
- `apps/roster/scripts/test-attendance.mjs` - End-to-end attendance
  recording suite (runs against a dev Convex deployment)
- `airtable_dump/` - Airtable dump/transform/seed pipeline (see
  `apps/roster/README.md` for the full re-import procedure)

## Agent Rules

- End every announced action with its tool call in the SAME turn — never
  end a turn on 'Re-running X next:' verification prose
