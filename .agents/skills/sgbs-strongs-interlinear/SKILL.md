---
name: sgbs-strongs-interlinear
description: Author, regenerate, and cross-check the Greek interlinear exercise pages (docs/exercises/lesson-4/*.md) where NIV verses pair with Tischendorf Greek + Strong's numbers and hover-highlighting maps English↔Greek word groups. Use when adding or editing passages in scripts/strongs/align_fine.py, running generate_strongs_pages.py or audit_alignment.py, adding a new exercise passage, or answering "how do we know the highlighting/alignment is right?" — any verification of the EN↔GR pairing against independent sources (MACULA glosses, BibleHub, STEP Bible).
license: MIT
---

# SGBS Strong's Interlinear Pages

The interlinear exercise pages pair NIV English with Tischendorf Greek and
Strong's numbers, joined by a **hand-authored** word-level alignment
(`scripts/strongs/align_fine.py`). No independent dataset pairs NIV words with
Strong's numbers — that pairing is licensed commercially — so correctness is
established by a three-layer cross-check. Follow all three layers whenever the
alignment changes; skipping a layer ships unverified data to students.

## Toolchain (repo paths — do not duplicate elsewhere)

- `scripts/strongs/align_fine.py` — the alignment data. Each verse is a list of
  `[english_chunk, [greek_0_based_indices]]`. Empty chunk = Greek-only group
  (untranslated particle); empty index list = English-only group (NIV-supplied
  word). Edit here first; everything else derives from it.
- `scripts/strongs/generate_strongs_pages.py` — builds
  `docs/exercises/lesson-4/*.md` and **refuses** to emit a page unless English
  chunks reconstruct each verse verbatim and Greek indices fully partition each
  verse (Layer 1).
- `scripts/strongs/audit_alignment.py` — cross-checks every group against
  MACULA (Nestle1904) per-token glosses and flags zero-overlap groups
  (Layer 2).

## Workflow

1. **Author** groups in `align_fine.py` at word granularity. Content word pairs
   with its own token; articles attach to their head noun; auxiliaries attach
   to their verb; genuinely untranslatable tokens get solo groups. Chunks must
   reproduce NIV text exactly.
2. **Generate**: `python3 scripts/strongs/generate_strongs_pages.py` — Layer 1
   must pass before anything else.
3. **Audit**: `python3 scripts/strongs/audit_alignment.py` — triage **every**
   flag to a written verdict (stopword group / documented synonym / NIV-supplied
   word / real mispairing). Fix real mispairings, re-run 2–3. The audit is
   triage, not proof — see
   [references/verification-gold-standard.md](references/verification-gold-standard.md)
   for the triage taxonomy, known textual variants, and the full methodology.
4. **Human sign-off**: a Greek-competent reviewer skims the flagged groups
   before the material is taught. Record the verdict.
5. **Lint + build**: `markdownlint docs/exercises/lesson-4/*.md` (MD033 exempt,
   MD013 on unbreakable lines is house baseline), then
   `pixi run -e website mkdocs build` — must be error-free.

## Required citations on every page

The 資料來源 section is not optional. It must list: NIV/Biblica copyright
attribution (≤500 verses site-wide), Tischendorf 8th ed. via bolls.life,
Strong's Concordance (public domain), and verify-it-yourself links (BibleHub
interlinear for the passage, STEP Bible, 微讀聖經), plus the note that the
EN↔GR groups are hand-authored. `generate_strongs_pages.py` emits this
automatically — do not hand-edit generated pages; edit the generator.

## Known textual cases

Do not "fix" these — they are correct and documented in
[references/verification-gold-standard.md](references/verification-gold-standard.md):
Rom 8:28 (ὁ θεός variant; NIV supplies "God"), 1 Cor 13:3 (καυθήσομαι
"be burned" vs NIV "boast"; "to the poor" absent from the critical text),
Phil 2:7→8 (versification seam, Greek-only + English-only groups).
