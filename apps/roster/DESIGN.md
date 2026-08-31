---
name: SGBS Roster — 小組查經訓練主日學
description: The church's scripture-page roster — warm paper, ink rules, vermilion marks.
colors:
  paper: "#faf6ec"
  paper-deep: "#f0e9d8"
  ink: "#262116"
  ink-soft: "#57503f"
  vermilion: "#b3402a"
  gold: "#c9a84c"
  rule: "#d8d2c4"
typography:
  display:
    fontFamily: '"Noto Serif TC", "Songti TC", "SimSun", serif'
    fontSize: "26px → 36px at ≥640px"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "0.06em"
  display-colophon:
    fontFamily: '"Noto Serif TC", "Songti TC", "SimSun", serif'
    fontSize: "36px → 48px at ≥640px"
    fontWeight: 900
    letterSpacing: "0.4em"
  headline:
    fontFamily: '"Noto Serif TC", "Songti TC", "SimSun", serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "0.15em"
  title:
    fontFamily: '"Noto Serif TC", "Songti TC", "SimSun", serif'
    fontSize: "15px"
    fontWeight: 700
  label:
    fontFamily: '"Noto Serif TC", "Songti TC", "SimSun", serif'
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.1em"
  body:
    fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.625
  overline:
    fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.2em"
  verse:
    fontFamily: '"Noto Serif TC", "Songti TC", "SimSun", serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 2
rounded:
  none: "0 — the default; sheet, fields, slips, seal are all square"
  tab: "0.375rem top corners only (rounded-t-md) — thumb tabs exclusively"
spacing:
  field-gap: "28px (space-y-7 between form fields)"
  cell: "10px 12px (py-2.5 px-3 table cells)"
  gutter: "20px → 48px at ≥640px (px-5 / sm:px-12)"
  kanban-gap: "20px (gap-5 between columns)"
  slip-gap: "8px (space-y-2 between slips)"
components:
  seal-stamp:
    textColor: "{colors.vermilion}"
    size: "48px → 56px at ≥640px"
  thumb-tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tab}"
    padding: "8px 20px → 8px 28px at ≥640px"
  thumb-tab-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.tab}"
    padding: "8px 20px → 8px 28px at ≥640px"
  submit-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "14px 0 → 14px 64px at ≥640px"
    width: "100% → auto at ≥640px"
  submit-primary-hover:
    backgroundColor: "{colors.vermilion}"
  field-ruled:
    textColor: "{colors.ink}"
    width: "100%"
    padding: "8px 0"
  kanban-slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "8px 12px"
  table-header-cell:
    textColor: "{colors.ink-soft}"
    padding: "10px 12px"
---

<!-- markdownlint-disable MD025 -->
<!-- MD025 is disabled for the required H1: the DESIGN.md format spec mandates
both a frontmatter `name:` and this H1, and MD025 counts the frontmatter name
as a top-level title. -->

# Design System: SGBS Roster — 小組查經訓練主日學

## Overview

<!-- markdownlint-disable-next-line MD036 -->
**Creative North Star: "和合本 Scripture Page"**

The roster is a page of the Chinese Bible. One centered sheet of warm
rice paper sits on a deeper paper ground; hairline rules carry the
content, and vermilion marks carry state. There is no dashboard chrome,
no card grid, no secondary accent — the page reads like a printed
scripture leaf: a heavy serif title, a cinnabar quarter seal, thumb
tabs riding the top rule, and content set on ruled lines.

Density is ledger-like. Tables run edge to edge inside the sheet with
tabular numerals, marginal vermilion row numbers, and right-aligned
"margin" columns, so a coordinator reads training state the way a
reader scans verse numbers. The registration form sets each field on a
single ruled line — label above, hairline beneath the value — and
closes with a colophon: a verse under a gold hairline with its citation
in vermilion.

The system explicitly refuses the generic admin look (white cards,
blue accent) and the Airtable aesthetic it replaced. Dignity comes from
restraint: two inks, one state color, one ornament color, and rules of
exactly two weights.

<!-- markdownlint-disable-next-line MD036 -->
**Key Characteristics:**

- One paper sheet (#faf6ec) on a deeper paper ground (#f0e9d8); depth
  from tone, not chrome
- Structure is drawn, not boxed — 1px hairlines (#d8d2c4) for content,
  2px ink rules for section weight
- Vermilion (#b3402a) is the only accent: state, marks, and emphasis,
  nothing decorative
- Gold (#c9a84c) exists only as ornament rules at 60–70% opacity,
  never as text
- Noto Serif TC display over Noto Sans TC body; Traditional Chinese
  first, Latin secondary and tracked
- Letter-spacing is the signature typographic device, ranging 0.06em
  to 0.4em
- Marginal verse-style numerals, double-rule table headers, attendance
  beat-line marks
- Square corners everywhere except the thumb tabs' 6px top radius

## Colors

The palette is a printer's tray: warm papers, two inks, one cinnabar,
one gold. Papers layer for depth, inks carry text, vermilion marks
state, gold ornaments.

### Primary

- **Cinnabar Vermilion** (#b3402a): State, marks, and emphasis — and
  nothing else. The quarter seal's 2px frame and text, required `＊`
  markers, marginal table row numerals, active view-nav links, kanban
  group counts, the error line and its top rule, "absent" beat circles,
  the global focus-visible outline, `::selection` background (paired
  with paper text), the text caret, submit-button hover, the
  `至少4堂課` emphasis phrase, and the verse citation
  (提摩太後書二章十五節).

### Named Rules (Colors)

**The Vermilion Is State Rule.** Vermilion appears only where something
is marked, active, required, or wrong — plus deliberate emphasis of key
phrases and the scripture citation. Body content is always ink. If a
string is ordinary content, it never turns vermilion.

### Secondary

- **Muted Gold Leaf** (#c9a84c): Ornament only, and only as rules at
  reduced opacity — the success colophon's top divider
  (`border-gold/60`) and the form help-note's left rule
  (`border-gold/70`). It deepens the paper world without adding a
  voice.

**The Gold Never Speaks Rule.** Gold is never text, never a fill, never
an icon. It is a hairline that whispers; the moment gold carries
meaning, it competes with vermilion.

### Neutral

- **Warm Rice Paper** (#faf6ec): The sheet — page background, thumb-tab
  active fill, kanban slips, select option lists, and the text color on
  ink or vermilion fills.
- **Aged Paper Ground** (#f0e9d8): The world behind the sheet (`html`
  background, so overscroll shows ground), table-row hover at 60%
  opacity, and the loading state's backdrop.
- **Brush Ink** (#262116): Primary text, the strong 2px section rules,
  the filled "attended" beat circle, the submit button's fill, and the
  focus-darkened form underline.
- **Faded Ink** (#57503f): Secondary text — supporting copy, table
  headers, placeholder and invalid select text, margin columns, view
  descriptions, footer — plus the custom select chevron stroke.
- **Hairline Rule** (#d8d2c4): All 1px content dividers — sheet border,
  header/footer rules, form underlines, row borders, the `th-double`
  companion line, the "unrecorded" beat dash, and the scrollbar thumb.

## Typography

**Display Font:** Noto Serif TC (weights 500/700/900 loaded; the system
rides 700/900), falling back to Songti TC, SimSun, serif
**Body Font:** Noto Sans TC (weights 400/500/700 loaded; 400/700 in
use), falling back to PingFang TC, Microsoft JhengHei, sans-serif

**Character:** A Traditional Chinese serif (明體-style) carries every
title, label, and name with liturgical dignity; the sans handles
running text. The document is `lang="zh-Hant"`. Tracking does the
expressive work — 0.06em on the page title up to 0.4em on the colophon
headline and submit button — while Latin appears only as a secondary
11px tracked strapline ("CITY LIGHT CHURCH · CBCGB") and the footer
colophon.

### Hierarchy

- **Display** (Serif TC 900, 26px → 36px at ≥640px, leading-tight,
  0.06em): The page title 小組查經訓練主日學.
- **Display-colophon** (Serif TC 900, 36px → 48px, 0.4em): The success
  state's 謝謝 / 已註冊 headline.
- **Headline** (Serif TC 700, 24px, 0.15em): The form's section header
  小組查經訓練註冊, above a 2px ink rule.
- **Title** (Serif TC 700, 15px): Student names in tables and kanban
  slips.
- **Label** (Serif TC 700, 14px, 0.1em): Form field labels, kanban
  column titles; thumb tabs and the legend word 圖例 share the style at
  0.2em tracking.
- **Body** (Sans TC 400, 14px, leading-relaxed 1.625): Prose, help
  notes, checkbox text, view descriptions. Form inputs render at 16px
  (`text-base`) for stable mobile input.
- **Overline** (Sans TC 700, 12px, 0.2em): Table column headers, in
  Faded Ink.
- **Verse** (Serif TC 400, 15px, leading-loose 2.0): Scripture
  quotations in the success colophon; its citation is Serif TC 12px at
  0.25em tracking in vermilion.

### Named Rules (Typography)

**The Tracking Compensation Rule.** Centered or justified tracked text
takes a matching left pad (`pl-[0.4em]` at 0.4em tracking) so the glyph
block optically re-centers — observed on the colophon headline and the
submit button's full-width mobile state.

## Layout

A single sheet floats on the ground. The page wrapper is `min-h-screen`
with paper-deep behind it, padded 12px/24px → 24px/48px at the 640px
breakpoint (the system's only breakpoint). The sheet itself is centered
with a 1px hairline border and is exactly as wide as its view requires:
`max-w-5xl` (64rem) for the registration form, `max-w-7xl` (80rem) for
the roster — width is a property of the view, not the viewport.

The sheet has three bands:

- **Header** — padded 20px→48px horizontally, 36px→48px top; the
  quarter seal sits absolutely at the top right (16px→40px inset);
  title block on the left; and the thumb-tab nav docks onto the
  header's bottom hairline with a -1px overlap so active tabs merge
  with the body.
- **Main** — padded 20px/40px → 48px/48px. The form column is
  `max-w-xl` (36rem) centered; tables fill the sheet width with
  `overflow-x-auto` and non-wrapping cells; kanban scrolls horizontally
  with 240px fixed columns.
- **Footer** — a hairline-topped colophon strip, centered 11px tracked
  text (小組查經訓練檔案 · 自二〇一五年秋).

Vertical rhythm: 28px between form fields, 40px before the submit
button, 10px/12px table cell padding, 24–32px between roster nav,
description, and content.

## Elevation & Depth

Depth is tonal rather than shadowed — with exactly one exception. The
sheet carries a single ink-tinted lift: `box-shadow: 0 1px 2px
rgba(38,33,22,0.05), 0 32px 64px -32px rgba(38,33,22,0.3)` — a tight
contact line plus a wide soft fall that raises the paper off the
ground. Everything inside the sheet is perfectly flat; layering is
expressed as paper tone (paper slips on paper ground), hairlines, and a
row hover that warms toward the ground color (`bg-paper-deep/60`).

### Shadow Vocabulary

- **Sheet lift** (`0 1px 2px rgba(38,33,22,0.05), 0 32px 64px -32px
  rgba(38,33,22,0.3)`): The page/sheet relationship only. Never applied
  to any element inside the sheet.

### Named Rules (Elevation)

**The Flat Page Rule.** No elevation changes on interaction. Hover and
focus are tone shifts (`hover:bg-paper-deep/60`) or color transitions,
never shadows, scale, or lift.

## Shapes

A square-corner system. The sheet, slips, seal, and every form control
are sharp; ruled inputs declare `rounded-none` explicitly. Borders do
the structural work in exactly three weights:

- **1px hairline** (#d8d2c4): content division — sheet frame,
  header/footer rules, form underlines, table row borders, the
  `th-double` companion line.
- **2px ink rule** (#262116): section weight — the form header's base,
  the table header row's base, kanban column headers' base, and the
  submit button's ink fill as its filled relative.
- **2px vermilion frame** (#b3402a): the quarter seal alone.

The signature border device is the **double rule** (`.th-double`): a
2px ink border with a 1px hairline floating 5px beneath it — the
classic printed-table header. Selects replace the native arrow with a
custom 12×8 SVG chevron (1.5px stroke, Faded Ink #57503f). The only
radius in the system is the thumb tabs' `rounded-t-md` (6px top
corners), the silhouette of a tab rising out of the rule.

## Components

### Quarter Seal Stamp (signature)

A 48px → 56px square, 2px vermilion border, holding the current quarter
split into two stacked serif lines ("2026" / "秋季", 10px → 12px bold,
0.2em tracking). It is the page's one authored motion: it stamps in on
load — 0.45s `cubic-bezier(0.16, 1, 0.3, 1)` after a 0.25s delay, from
3° tilt at 1.3× scale down to scale 1 (the tilt lives in the stamp, not
the resting state), behind `prefers-reduced-motion: no-preference`.

### Thumb Tabs (primary nav)

Rounded-top (6px) tabs with side-and-top hairline borders only
(`border-b-0`), serif bold 14px at 0.2em tracking. Active: paper fill,
ink text, hairline border — the sheet continues through the tab.
Inactive: transparent, Faded Ink, warming to ink on hover
(`transition-colors`). `aria-current="page"` marks the active tab;
keyboard focus gets the global vermilion outline.

### Chapter-Tab View Nav (roster)

An inline, wrap-friendly row of serif 14px view links (全體 · 本季度 ·
主領 …) separated by hairline-colored `·` marks (`aria-hidden`), over a
full hairline base. Active view: bold vermilion. Inactive: Faded Ink to
ink on hover. `aria-pressed` marks the active view; each view carries a
12px description line beneath.

### Ruled Fields

The form language is the ledger line. Labels are serif bold 14px at
0.1em tracking with a fullwidth vermilion `＊` (`aria-hidden`) for
required; optional help text sits against a gold hairline
(`border-l border-gold/70`, 12px Faded Ink). Inputs and selects are
transparent, borderless except a 1px bottom hairline, 16px ink text, no
radius, no ring — focus darkens the rule to ink (`focus:border-ink`).
Placeholders and unselected selects render in Faded Ink
(`invalid:text-ink-soft`); selects hide the native arrow for the custom
chevron, and option lists are paper/ink. WebKit autofill is overridden
to paper fill with ink text so browser chrome never breaks the page.
The attendance checkbox uses the native control at 16px with
`accent-vermilion`.

### Submit Button

An ink block — full-width on mobile, auto-width with 64px side padding
at ≥640px — serif bold 16px at 0.4em tracking (with the `pl-[0.4em]`
compensation) in paper text. Hover transitions the fill to vermilion;
disabled drops to 50% opacity and reads 遞交中.

### Success Colophon

The form's success state replaces itself with a centered colophon
(`ink-in`: 0.7s blur-3px-to-sharp reveal, reduced-motion-guarded): the
tracked serif headline, a Faded Ink explanation, then the verse block —
a gold hairline (`border-gold/60`) over loose-set scripture in serif
15px, cited in 12px vermilion tracking.

### Error Line

A `role="alert"` paragraph under a vermilion top hairline: serif 14px,
0.05em tracking, vermilion text. Server errors arrive in Chinese and
pass through; anything else collapses to one recovery line
(遞交失敗，請檢查網路後重試…).

### Student Table

A printed-table read: full-width, collapsed borders, `tabular-nums`.
Header row closes on a 2px ink rule; each `th` is a `th-double` — 12px
bold 0.2em Faded Ink with the 1px companion hairline 5px below. The
leading narrow column hides a screen-only 序號 header; each row opens
with its marginal numeral (serif 12px vermilion, right-aligned). Name
cells are serif bold 15px ink; "margin" columns (dates, counts) are
right-aligned Faded Ink; empty values render as —. Rows close on
hairlines and warm to `bg-paper-deep/60` on hover. All views sort by
name (`zh-Hant` collation) and close with a right-aligned count line
(共 N 條記錄).

### Attendance Beat Marks (signature)

Five 12×12 inline SVGs per student on a 6px-gap beat line: attended =
4px-radius filled ink circle; absent = open 1.6px vermilion circle;
unrecorded = 1.6px hairline dash. The group carries `role="img"` with a
spoken summary (課堂出席：N 堂出席、N 堂缺席); a legend (圖例 + three
labeled marks, 12px) sits under the 缺課 view.

### Kanban Columns & Slips

Horizontally scrolling columns, fixed 240px, 20px gaps. Each column
header closes on a 2px ink rule with the serif bold title left and the
count in 12px vermilion tabular numerals right; columns sort by count
descending. Slips are paper squares with hairline borders (8px/12px
padding): serif bold name, truncated 12px Faded Ink email; students
sort by `zh-Hant` name.

### Empty / Loading States

Both are quiet serif lines, centered and tracked, in Faded Ink —
此檢視暫無記錄 (0.25em, generous 56px padding) and 載入中…… (0.3em). No
spinners, no skeletons.

### Browser Surfaces

The design claims the browser's own surfaces: `color-scheme: light`;
`::selection` in vermilion with paper text; global `:focus-visible` as
a 2px vermilion outline offset 2px (fields replace it with the
ink-darkened underline); thin scrollbars with hairline thumbs; vermilion
caret; autofill repainted in paper/ink.

## Do's and Don'ts

### Do

- **Do** reserve vermilion for state, marks, and emphasis — active nav,
  required marks, numerals, counts, errors, focus, selection — per The
  Vermilion Is State Rule.
- **Do** keep gold at 60–70% opacity and only as ornament rules, per
  The Gold Never Speaks Rule.
- **Do** structure with rules: 1px #d8d2c4 hairlines for content, 2px
  ink rules for section weight, the `th-double` device for table
  headers.
- **Do** set form values on bottom hairlines that darken to ink on
  focus, with 16px input text and themed autofill.
- **Do** compensate centered tracked text with matching left padding
  (`pl-[0.4em]` at 0.4em tracking).
- **Do** use tabular numerals (`tabular-nums`) in tables, counts, and
  the seal.
- **Do** gate any new animation behind
  `prefers-reduced-motion: no-preference`.

### Don't

- **Don't** build the generic admin dashboard — no white cards, no blue
  accent, no generic SaaS chrome; that refusal is the system's founding
  constraint.
- **Don't** add shadows beyond the sheet lift; interaction is tone and
  color, never elevation.
- **Don't** round corners anywhere except the thumb tabs' 6px top
  radius.
- **Don't** set gold as text or fill, and don't introduce additional
  accent hues.
- **Don't** let browser chrome surface in system colors — selection,
  focus ring, caret, scrollbar, and autofill all carry the palette.
- **Don't** replace the custom select chevron with the native arrow,
  and don't restyle placeholders or unselected selects in full ink
  (they stay Faded Ink).

## Addendum: Auth, Roles & Scoped Surfaces (2026-08-30)

Clerk authentication landed after this document was first recorded. The
visual world above is unchanged; this addendum records the role model and
the surfaces it created, so the intent of the student-vs-instructor split
survives refactors. Full operational detail lives in README.md.

### The role model (intent)

Three experiences, derived server-side on every request. An email is an
instructor only while its row in the `instructors` table carries
`active: true`; every other signed-in account is a student; signed-out is
a guest. Students see their own world only: own group, own season, own
name editable. The instructor is the editor of last resort: every group,
every quarter, every assignment. UI tab-hiding is convenience; the Convex
functions are the gate.

### Role-gated chrome

The thumb-tab nav renders per role. Guest: a single 報名 tab over the
sign-in prompt. Student: 註冊, 我的組, 聯絡表, 課堂安排. Instructor: 註冊,
分組, 名單, 課堂安排. The UserButton replaces the 登入 control when
signed in. Default tab is 註冊 for both signed-in roles.

### Registration, two modes

One form component, two modes. Self mode (students): name prefilled from
the Clerk profile, email identity-locked and rendered as ruled text, not
an input. Admin mode (instructors): identical ruled fields plus an
editable 郵箱, so 同工 can register someone else at the door; the success
colophon grows a 登記另一位 button that resets the sheet for the next
person. Both modes keep the verse (提後 2:15) as the closing beat.

### Student self-service schedule

The student 課堂安排 table is scoped to the viewer's group: every cell
shows only that group's people. The student's own chip carries a remove
control; empty cells carry 我來主領 / 我來觀察 actions that insert the
student's own name server-side (one role per week — taking one drops the
other). Other people's chips have no controls. The point is first-day-of-
class self-organization with zero instructor data entry, in real time.

### Group Assigner (instructor surface)

分組 turns the diversity algorithm into a draft the instructor owns:
group size control, one-click 一鍵平均分組, per-student move selects,
inline group renames, and an explicit 儲存分組 before anything persists.
Draft names start at 第N組 and are meant to be replaced with real names
on the first day. The unsaved draft is fully disposable; the saved state
is re-derivable from the roster at any time.

### Directory scoping

聯絡表 scoping follows the role: students see the current season only and
get a fixed season label instead of a quarter selector; instructors keep
the quarter filter across the full archive. Enforcement is in the
`directory` query, not the component.

### Type ramp update

The 2026-08-30 readability pass raised the working sizes: table and body
text 16px, student names 17px serif, column headers 13px tracked, hints
13px, marginal numerals 14px. The 10px size survives only inside the
quarter seal. Inputs stay at 16px so iOS never auto-zooms a field.
