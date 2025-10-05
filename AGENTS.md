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
