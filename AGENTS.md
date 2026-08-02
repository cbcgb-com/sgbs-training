# Notes for AI

Every change MUST be self-coherent with existing content. Flag any contradictions or
confusing content to me. Update AGENTS.md if needed.

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

Shared vanilla HTML/JS pattern (`docs/javascripts/content-quiz.js`, wired in
`mkdocs.yml`) for MCQs in class notes. One module, two modes via `data-mode`:

- Markup: `.content-quiz` > `.content-quiz__item` with choices + per-choice
  `.content-quiz__reflection` (`data-choice="0"` …)
- Author a full question bank in the markdown; JS randomly samples
  `data-sample-size` items (default 3), **shuffles each item's option order**
  (and relabels A/B/C…), then presents questions one-at-a-time with
  上一題／下一題 flip-through. Keep `data-correct` / `data-choice` on the
  authored option indices; only presentation order is random.
- Stems avoid bare「為什麼」; prefer「怎樣／哪一種／最需要小心的是」等具體框架
- Traditional Chinese; keep tone respectful for adult learners
- Update the lesson TOC when adding a quiz section

**`data-mode="reflect"`** (課前思考題): place **immediately above** the first
pre-reading subsection (e.g. before「分析敘述文」). No correct answer; every
option gets a soft「值得思考」note that primes the reader for the section ahead.
Questions should be thought-provoking, with plausible distractors and no
obvious winner.

**`data-mode="review"`** (預讀複習題): place at the **end of 第一部分**, right
before「第二部分：課堂實作活動」. Comprehension check on section content. Each
`.content-quiz__item` needs `data-correct="0"`-based index; wrong/right choices
are marked, and the selected option’s reflection explains using「答對了」/
「再看一下」. **Always four options (A–D)** per item: the three distractors
should each name a **plausible learner misconception** (e.g. skipping to
application, mistaking one OEIA step for another, treating background as the
whole message), and each wrong option’s reflection should briefly **illuminate
why that path misleads**—not just say「錯了」.

Inline mini-checks (also `data-mode="review"`) may sit mid-section after a
framework interactive; keep the bank small (`data-sample-size="2"`) and tightly
tied to the just-taught idea. Same **four-option / misconception** rule as
section-end review quizzes.

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

### Content decks (`.content-deck`)

Shared vanilla HTML/JS pattern (`docs/javascripts/content-deck.js`, wired in
`mkdocs.yml`) for quiz-style paginated cards: one card at a time with
上一張／下一張. Use for typed inventories that should be browsed, not tabulated
(e.g. 作者可能想要傳達的信息類型).

- Markup: `.content-deck` > optional `.content-deck__intro` + two or more
  `.content-deck__card` with `data-label="…"`
- Optional `data-label` on the root names the region for accessibility
- Prefer short prompt + one `.content-deck__example` callout per card
- Shows the full set in authored order (no random sampling)
- Traditional Chinese; keep each card scannable on its own

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