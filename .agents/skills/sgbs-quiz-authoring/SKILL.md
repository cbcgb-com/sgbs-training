---
name: sgbs-quiz-authoring
description: >
  Author, edit, expand, or review the interactive content quizzes (.content-quiz)
  of this course — the reflect (課前思考題) and review (練習/複習) banks under
  docs/quizzes/lesson-N/ and their iframe embeds in docs/class-notes/*.md.
  Use when asked to add a quiz, write or fix quiz questions, expand a bank,
  change quiz behavior (sampling, pass thresholds), or audit question quality.
  Covers the two question categories, the 10-item bank convention, randomization,
  data-pass-correct, no-winner reflect style, misconception distractors,
  question-type variation, the file shell, and the localhost verification pass.
---

# SGBS Quiz Authoring

All quizzes share ONE engine: `docs/javascripts/content-quiz.js` (wired
site-wide in `mkdocs.yml`). Banks are standalone HTML pages in
`docs/quizzes/lesson-N/<slug>.html`, embedded in lesson markdown with a
borderless iframe:

```text
<iframe class="content-quiz-frame" src="../../quizzes/lesson-N/<slug>.html"
title="…" loading="lazy" scrolling="no"></iframe>
```

The iframe reports its height via postMessage (`content-quiz-frame.js`);
lazy-loaded frames stay at ~160px until scrolled into view — that is normal,
not a bug.

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
`data-correct` / `data-choice` on the AUTHORED indices — the engine stamps
`data-choice-index` and shuffles display order + relabels A/B/C itself;
correctness mapping survives shuffling.

## The two categories (do not blur them)

**Reflect (課前思考題, `data-mode="reflect"`)** — placed at the top of
Part 1. Bank of 10, `data-sample-size="3"` (each visit samples 3, in
randomized question + option order). NO `data-correct`, NO
`data-pass-correct`, no 「答對了/再看一下」. Every option is
partially-right — no winner, no option that "the lesson endorses". Each
reflection: 「值得思考」 → affirm the grain of truth → one probing question →
pointer to the section ahead. Items must be self-contained (any 3 can be
sampled).

**Review (練習/複習, `data-mode="review"`)** — inline mini-checks after a
framework, and the 預讀複習題 at the end of Part 1. Bank of 10,
`data-sample-size="10"` (all shown, random order), `data-pass-correct="4"`
(ends early with 「練習完成！已答對 4 題。」). Each item has exactly one
correct answer; each WRONG option embodies a specific student misconception,
and its reflection names that misconception and corrects it
(「再看一下」/「答對了」).

## Option craft (the subtlety bar)

The correct answer must not be identifiable by style. Before shipping a
bank, check every item against this list:

- **Length & register parity** — all four options within ~20% of the same
  length, same tone. A longer, more hedged option is a giveaway.
- **No strawmen, no dismissive tone** — ban phrasings like 「跳過就好」
  「只是在…與…無關」「是組員不夠認真」「無法歸類」. Every distractor gets a
  true-sounding core plus a subtle flaw:
  - wrong scope (true for a different case than the stem describes)
  - right conclusion, wrong reason/mechanism
  - half-true (fixes one symptom, ignores the cause)
  - plausible-but-arranges-the-wrong-thing (e.g. 「一起討論」 used where
    individual think-time is needed)
- **Vocabulary parity** — don't echo the lesson's exact key phrase only in
  the correct option; put lesson vocabulary into distractors too where it
  fits, so keyword-spotting fails.
- **Stem discipline** — the stem must not contain the correct option's
  keyword (if the stem says 「回到經文核對」, don't make 「根據經文…」 the only
  option mentioning 經文 — give another option a 經文-flavored clause).
- **Feedback does the teaching** — because options are genuinely close,
  the reflection is where the discrimination gets explained; name the
  misconception, then state the difference.

## Question-type variation (hard rule)

Never ask the same format ten times. Rotate archetypes within a bank:

- Forward scenario → pick the answer (max ~2 of these per bank)
- Reverse inference: given the prompt/fix that was applied, infer the intent
  or the original problem
- Best fix / best rewording of a bad question
- Odd-one-out: which question does NOT need X / which is NOT an example
- Misfire diagnosis: the leader used the wrong prompt/fix — what went wrong
- Prevention diagnosis: which phrasing would have prevented this failure
- Definition matching: given the symptom, name the category
- Sequencing/pairing: order two items or two moments (opening vs closing)
- Classification; spot-the-misclassification; which-is-NOT; missing-element;
  evidence-matching; counterfactual (if we removed X, what is lost)

If a bank is a deliberate single-skill drill, say so in its intro; still
rotate at least 3 archetypes.

## Authoring style

- Traditional Chinese; respectful tone for adult learners.
- Stems avoid bare「為什麼」; use 「怎樣／哪一種／最需要小心的是」.
- Distractors are plausible misconceptions, not jokes — each names a real
  way a student goes wrong; keep option lengths similar so the correct
  answer isn't visibly longer.
- Review reflections: 「再看一下」 explains WHY that path misleads;
  「答對了」 reinforces the principle (not just "correct").
- Quiz intro lines in the lesson md are ONE short, warm invitation to
  attempt the quiz (e.g. 「讀完第一部分了嗎？用下面的複習題測試一下自己，
  看看掌握了多少。」); keep only load-bearing functional clauses (the pass
  rule like 「答對 4 題即完成」, or 「步驟一已替你準備」). Never describe
  randomization mechanics (sampling/shuffling — that's the engine's job),
  never preview the misconceptions, never explain the feedback system.
- Watch for `<spanstrong>`-style tag typos when bolding inside prompts
  (recurring slip); grep after writing.

## Verification pass (localhost)

1. Serve: `( nohup pixi run -e website serve > /tmp/sgbs-mkdocs.log 2>&1 & )`
   → `http://localhost:8010/sgbs-training/class-notes/lesson-N-…/` (note the
   `/sgbs-training/` prefix).
2. Browser (agent-browser via CDP): scroll each
   `iframe.content-quiz-frame` into view (lazy loading), then via
   `contentDocument` check: bank = 10 items, `data-sample-size`, nav status
   「第 1 / N 題」, `data-pass-correct` present on review quizzes only.
3. Simulate answering (same-origin iframe DOM): click correct options →
   status flips to 「練習完成！已答對 N 題。」 at the threshold; on a quiz
   without the attribute, verify NO early end.
4. `agent-browser errors` after a clear+reload — quiz JS must produce none
   (search-worker origin noise is pre-existing site behavior).
5. Run `markdownlint` on any edited lesson `.md`; MD033 is the documented
   raw-HTML exception; MD013 hits on iframe one-liners and long HTML content
   lines match the house baseline (compare against `git show HEAD:` if unsure).
6. Sanity-grep new HTML for `<spanstrong>` and for stray simplified
   characters (没/问/题…) — files must stay Traditional Chinese. Also count
   parity per bank: `grep -c 'content-quiz__choice"'` must equal
   `grep -c 'content-quiz__choice-label'` and `content-quiz__choice-text` —
   a choice without its label span renders with no A/B/C letter.

## Behavior map (engine, for reference)

- Sampling: `shuffle(allItems).slice(0, sampleSize)` — random question order
  every load.
- Options: Fisher–Yates shuffle per shown item + A/B/C relabel by visual
  position.
- Early pass: review-only, opt-in via `data-pass-correct="N"`; wrong answers
  don't count; 上一題 still reviews; finished state persists across
  navigation.
- Height: ResizeObserver + postMessage; frames auto-size — don't hand-set
  iframe heights.
