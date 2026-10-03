---
name: sgbs-quiz-authoring
description: >
  Author, edit, expand, or review the interactive content quizzes (.content-quiz)
  of this course — the pre-quiz (課前思考題 / reflect) and post-lesson
  (練習/複習 / review) banks under docs/quizzes/lesson-N/ and their iframe
  embeds in docs/class-notes/*.md. Use when asked to add a quiz, write or
  fix quiz questions, expand a bank, change quiz behavior, or audit quality.
  This skill is the single place for quiz design: the three forms
  (post-lesson misconception MCQ, pre-quiz partial answers, anti-repetition),
  adversarial sub-agent review before done, option craft, placement,
  file shell, and verification.
---

# SGBS Quiz Authoring

This skill is the **single consolidated place** for quiz design. Do not
keep a second copy of these rules in `AGENTS.md` or another doc.
`AGENTS.md` only points here.

All quizzes share ONE engine: `docs/javascripts/content-quiz.js` (wired
site-wide in `mkdocs.yml`). Banks are standalone HTML pages in
`docs/quizzes/lesson-N/<slug>.html`, embedded in lesson markdown with a
borderless iframe:

```text
<iframe class="content-quiz-frame" src="../../quizzes/lesson-N/<slug>.html"
title="…" loading="lazy" scrolling="no"></iframe>
```

The iframe reports its height via postMessage (`content-quiz-frame.js`);
lazy-loaded frames stay at ~160px until scrolled into view — that is
normal, not a bug. Copy an existing `docs/quizzes/lesson-2/*.html` shell
when adding a new bank. Update the lesson TOC when adding a quiz
section. Learner-facing copy is Traditional Chinese.

## How quizzes are designed (three choices)

These three are the way quizzes are designed. Do not blur them. They
map onto the existing `data-mode="reflect"` / `data-mode="review"`
engine — do not invent a new quiz system.

### 1. Post-lesson multiple choice tests for misconceptions

**When:** after the learner has studied the relevant teaching — an
inline mini after a framework, or 預讀複習題 at the end of Part 1,
immediately before「第二部分：課堂實作活動」.

**Engine:** `data-mode="review"`. Full-section banks: 10 items,
`data-sample-size="10"`, `data-pass-correct="4"` (ends early with
「練習完成！已答對 4 題。」). Inline minis stay tightly tied to the
just-taught idea; same option rules. Each item needs `data-correct`
(0-based authored index).

**Item shape:** exactly **one correct answer** and **three incorrect
options**. The item must force thinking (discriminate a real mix-up,
not recall a slogan).

Author each incorrect option in this order — do not write the sentence
first and reverse-engineer a flaw:

1. **Name the misconception** — a short, specific label for one real
   way a learner goes wrong (e.g. 「書卷標籤」「應用提前」
   「別卷覆蓋本段」). Put that same label at the start of the option
   (`名稱：…`) and at the start of its `再看一下` reflection.
2. **Write the option** so it looks plausible to someone who holds
   that misconception: the sentence that person would actually
   endorse — a true-sounding core plus the flaw.

The correct option uses the same `名稱：陳述` shape, naming the *right*
concept, so style does not give the key away.

Ban: joke options; filler; options that are wrong only because of a
wording slip (extra/missing particle, near-synonym, typo-level
contrast); 「以上皆是／以上皆非」and the same idea under other wording.

If you cannot name three distinct misconceptions, the stem is not ready.

Reflections: 「再看一下」opens with the misconception label, then
explains how that path misleads; 「答對了」reinforces the principle
(not just "correct").

### 2. Pre-quizzes come before reading

**When:** immediately above the first Part 1 pre-reading subsection
(e.g. before「分析敘述文」/「分析論說文」).

**Engine:** `data-mode="reflect"`. Bank of 10, `data-sample-size="3"`
(each visit samples 3, randomized question and option order). NO
`data-correct`, NO `data-pass-correct`, no 「答對了/再看一下」.

**Item shape:** four options, and **every option is a partial answer**
— not one correct and three wrong. Do not mark one option as the
single correct answer. No option is the one the lesson endorses.

Selecting an option must return a response that **challenges the
learner to think further about that particular answer**: 「值得思考」
→ affirm the grain of truth in *this* choice → one probing question
aimed at this choice → pointer to the section ahead. Items must be
self-contained (any 3 can be sampled).

### 3. Anti-repetition across the whole bank

Non-negotiable, across the **entire** question bank of a lesson and
**every** form (pre-quizzes + inline minis + post-lesson review). If
15 questions are requested, all 15 must be very distinct and diverse
in angle. No near-duplicates and no variations of the same underlying
question. A past failure was 7 to 10 of 15 questions being basically
the same one.

Before finishing, list each item in one line (form + angle). If two
lines share an angle — same connective, same verse role, same tool
definition, same diagnosis — replace one. Using the same example
passage is allowed only when the *task* is different (e.g. a pre-quiz
habit question vs a post-lesson keyed discrimination). Diversity of
angle is stricter than diversity of format.

## Adversarial review (required before done)

The **main agent doing the coding** must not treat a quiz set as done
after writing it. Before commit/PR, it must send out **review
sub-agents**. Those reviewers are adversarial: their job is to try to
show the questions are not good enough, not to confirm they look fine.

Dispatch at least two local sub-agents in parallel (do not skip this
because you already self-checked). Give each the lesson source markdown
and every quiz HTML file in the lesson set. Instruct them to **reject
or send back** any item that fails form 1, form 2, or form 3.

Required review jobs:

- **Pairwise and whole-bank hunt.** Compare questions in pairs, and
  also look at the whole bank together. Catch near-duplicates, the same
  underlying question in different clothes, and thin coverage of a
  single angle. Return a one-line angle list plus every pair that
  should be merged or replaced.
- **Source-coverage hunt.** Compare the bank against the source lesson
  text. List teaching claims in the lesson that have no item, and items
  that test something the lesson does not teach. Thin coverage of a
  whole subsection is a send-back.
- **Form-compliance hunt.** For every post-lesson item: one key, three
  named misconceptions, plausible holder-sentences, no jokes/filler/
  wording-slip/皆是皆非. For every pre-quiz item: no `data-correct`,
  every option a partial answer, reflection challenges *that* choice.
  Send back any item that fails.

The main agent must **fix every send-back** (replace or rewrite the
item, not defend it) and re-run a failed job if the bank changed
substantially. Only then run the localhost verification pass.

## File shell

Every bank is a standalone page:

```html
<!DOCTYPE html>
<html lang="zh-Hant" class="content-quiz-embed-root">
<head>… <link rel="stylesheet" href="../../stylesheets/extra.css">
<link rel="stylesheet" href="../../stylesheets/content-quiz-embed.css"></head>
<body class="content-quiz-embed">
<div class="content-quiz" id="content-quiz-lesson-N-<slug>"
     data-mode="reflect|review" data-sample-size="…"
     [data-pass-correct="4"]>
  <div class="content-quiz__item" [data-correct="n"]>…</div>
</div>
<script src="../../javascripts/content-quiz.js"></script>
</body>
</html>
```

Item anatomy: `.content-quiz__prompt` (num + stem), 4 ×
`.content-quiz__choice` (label A–D + text), and per-choice
`.content-quiz__reflection` (`data-choice="0"…`, `hidden`). Keep
`data-correct` / `data-choice` on the AUTHORED indices — the engine
stamps `data-choice-index` and shuffles display order + relabels A/B/C
itself; correctness mapping survives shuffling.

## Option craft (the subtlety bar)

The correct answer (post-lesson only) must not be identifiable by
style. Before shipping a post-lesson item, check:

- **Length & register parity** — all four options within ~20% of the
  same length, same tone. A longer, more hedged option is a giveaway.
- **No strawmen, no dismissive tone** — ban「跳過就好」「只是在…與…
  無關」「是組員不夠認真」「無法歸類」. Every distractor gets a
  true-sounding core plus a subtle flaw: wrong scope; right conclusion
  wrong reason; half-true; plausible-but-arranges-the-wrong-thing.
- **Vocabulary parity** — don't echo the lesson's exact key phrase
  only in the correct option.
- **Stem discipline** — the stem must not contain the correct option's
  keyword as the only giveaway.
- **Feedback does the teaching** — because options are close, the
  reflection is where the discrimination gets explained.

## Question-type variation

Never ask the same *format* ten times (this supports form 3, it does
not replace it). Rotate archetypes within a bank:

- Forward scenario → pick the answer (max ~2 of these per bank)
- Reverse inference: given the prompt/fix, infer the intent or problem
- Best fix / best rewording
- Odd-one-out / which-is-NOT
- Misfire diagnosis; prevention diagnosis
- Definition matching; sequencing/pairing
- Classification; spot-the-misclassification; missing-element;
  evidence-matching; counterfactual

If a bank is a deliberate single-skill drill, say so in its intro;
still rotate at least 3 archetypes. Angle diversity (form 3) is the
harder gate: two items can use different formats and still be the
same underlying question — replace one.

## Authoring style

- Traditional Chinese; respectful tone for adult learners.
- Stems avoid bare「為什麼」; use「怎樣／哪一種／最需要小心的是」.
- Quiz intro lines in the lesson markdown are ONE short, warm
  invitation (e.g. 「讀完第一部分了嗎？用下面的複習題測試一下自己，
  看看掌握了多少。」). Keep only load-bearing functional clauses
  (the pass rule, or「步驟一已替你準備」). Never describe
  randomization, never preview misconceptions, never explain the
  feedback system.
- Watch for `<spanstrong>`-style tag typos when bolding inside
  prompts; grep after writing.

## Verification pass (localhost)

0. Adversarial sub-agent review above has been run and every send-back
   fixed. Do not start localhost checks on a bank the reviewers rejected.

1. Serve: `( nohup pixi run -e website serve > /tmp/sgbs-mkdocs.log 2>&1 & )`
   → `http://localhost:8010/sgbs-training/class-notes/lesson-N-…/`
   (note the `/sgbs-training/` prefix).
2. Browser: scroll each `iframe.content-quiz-frame` into view, then
   via `contentDocument` check bank size, `data-sample-size`, nav
   status「第 1 / N 題」, and `data-pass-correct` on review only.
3. Simulate answering: review quizzes flip to「練習完成！已答對 N 題。」
   at the threshold; pre-quizzes must NOT end early and must NOT
   mark a correct option.
4. `agent-browser errors` after a clear+reload — quiz JS must produce
   none (search-worker origin noise is pre-existing).
5. `markdownlint` on any edited lesson `.md`; MD033 is the documented
   raw-HTML exception.
6. Sanity-grep new HTML for `<spanstrong>` and stray simplified
   characters (没/问/题…). Count parity: `content-quiz__choice"` =
   `content-quiz__choice-label` = `content-quiz__choice-text`.
7. **Anti-repetition check:** one-line angle list for every item in
   the lesson (all forms). Replace any restatement.

## Behavior map (engine, for reference)

- Sampling: `shuffle(allItems).slice(0, sampleSize)` — random
  question order every load.
- Options: Fisher–Yates shuffle per shown item + A/B/C relabel by
  visual position.
- Early pass: review-only, opt-in via `data-pass-correct="N"`; wrong
  answers don't count; 上一題 still reviews; finished state persists
  across navigation.
- Height: ResizeObserver + postMessage; frames auto-size — don't
  hand-set iframe heights.
