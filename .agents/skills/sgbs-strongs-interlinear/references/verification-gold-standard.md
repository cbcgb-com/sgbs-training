# Verification Gold Standard: EN↔GR Interlinear Alignment

This is the full cross-check methodology used to validate the interlinear
exercise pages (`docs/exercises/lesson-4/*.md`). It exists because no
independent dataset pairs NIV words with Strong's numbers — the pairing is
hand-authored, so correctness must be *demonstrated*, not assumed.

## The three verification layers

Trust comes from three independent layers. Each catches a different class of
error; none substitutes for the next.

### Layer 1 — Build-time structural verifier (machine, exhaustive)

`generate_strongs_pages.py` refuses to emit a page unless, **per verse**:

1. The English chunks of all groups concatenate **exactly** to the verse text
   (whitespace-joined). Catches typos, dropped words, duplicated words.
2. The Greek token indices across all groups form a **complete partition** of
   the verse's tokens (each index used exactly once). Catches orphaned tokens,
   double-assigned tokens, and out-of-range indices.

This layer is cheap, deterministic, and runs on every generation. It guarantees
*completeness*, not *correctness of pairing* — a wrong-but-complete pairing
passes Layer 1.

Real catches from the first fine-graining pass: a dropped τούτους (Rom 8:30)
and ἐν τῷ (Gal 5:14) — both would have shipped silently without the partition
check.

### Layer 2 — Independent-dataset gloss audit (machine, semantic)

`audit_alignment.py` compares every group's English chunk against the MACULA
(CLEAR Bible, Nestle1904) English **gloss** of each paired Greek token. MACULA
is a third, fully independent dataset (different Greek edition pipeline,
different tagging team).

- **1-based vs 0-based**: MACULA refs are `PHP 2:1!1` = *first word* (1-based);
  alignment indices are 0-based. Audit lookups must use `i + 1`. Symptom of
  getting this wrong: every flag's gloss is the *previous* token's.
- **Result interpretation**: in the shipped run, 310/538 groups matched
  directly; 228 flagged; manual triage of all 228 found zero content-word
  mispairings (see triage taxonomy below).
- **This layer is triage, not proof.** Glosses differ from translations by
  design (τὸ τέλειον glossed "perfect", NIV "completeness"; στέγω glossed
  "bears", NIV "protects"). Empty-overlap is a *prompt for human review*, never
  auto-rejectable.

### Layer 3 — Human review with per-flag triage (the actual gold standard)

Every Layer-2 flag gets a human verdict in exactly one of these categories —
keep a written record:

1. **Stopword group** — the English chunk is all function words (the/and/of/
   that/but) whose Greek counterparts are likewise function words (καί, δέ,
   ὁ/ἡ/τό = 3588, πρός…). Article attaches to its head noun; particles pair
   with the clause connective or go solo.
2. **Documented synonym** — gloss and NIV render the same lexeme differently:
   trouble/tribulation (θλῖψις), witchcraft/sorcery (φαρμακεία),
   emptied/made nothing (ἐκένωσεν), fellowship/common sharing (κοινωνία),
   walk in step/walk (στοιχῶμεν), puffed up/proud (φυσιόω).
3. **NIV-supplied word** — English word with no Greek counterpart (NIV "gift"
   in 13:2; "God" in Rom 8:28 — see variants below). Correctly solo or merged
   into its head verb's group.
4. **REAL mispairing** — content word grouped with unrelated content word. Any
   flag in this category means: fix `align_fine.py`, re-run Layer 1 + 2,
   re-review.

The shipped review cleared 228/228 flags into categories 1–3.

## Known textual cases (do not "fix" these — they are correct)

- **Rom 8:28** — NIV "God works": the critical text (Tischendorf, Nestle1904)
  has no written θεός as subject; BibleHub shows (ὁ θεὸς) parenthesized as the
  Byzantine/TR variant. "God" therefore groups with συνεργεῖ (4903), and τὸν
  θεόν in the same verse belongs to "love him".
- **1 Cor 13:3** — Tischendorf reads καυθήσομαι "be burned" (2545, καίω); NIV
  follows καυχήσομαι "boast" (καυχάομαι) — hence "to hardship that I may
  boast". The group pairs the clause faithfully across the variant.
- **1 Cor 13:3** — "to the poor" is absent from the critical text (TR has
  τοῖς πτωχοῖς); the group is correctly English-only.
- **Phil 2:7→8** — Tischendorf ends v7 with καὶ σχήματι εὑρεθεὶς ὡς ἄνθρωπος,
  which NIV moves to the start of v8 ("And being found in appearance as a
  man"). The Greek tail is a Greek-only group at the end of v7; the NIV clause
  is an English-only group opening v8. Per-verse groups cannot pair across the
  boundary — that is the honest representation.

## Source registry

| Source | URL | Authoritative for | Notes |
|---|---|---|---|
| bolls.life API | https://bolls.life | TISCH Greek text + Strong's tags (`/get-chapter/TISCH/{book}/{ch}/`, `<S>nnnn</S>` after each word) | bolls removed NIV at Biblica's request — do not expect NIV there |
| MACULA Nestle1904 | https://github.com/clear-bible/macula-greek | independent glosses + Strong's for cross-checking | leaf `Node` tags carry `ref="ROM 8:28!1"` (1-based!), `StrongNumber`, `Gloss`, `Unicode` |
| NIV text | github.com/aruljohn/Bible-niv | English verse text (plain) | no Strong's, and none exists lawfully: Biblica blocks free APIs; NIV+Strong's is a licensed commercial product |
| BibleHub interlinear | https://biblehub.com/interlinear/{book}/{ch}-{v}.htm | manual spot-check of any word | third line is *glosses*, not NIV — never compare it word-for-word with NIV |
| STEP Bible | https://www.stepbible.org | edition comparison (incl. Tischendorf) | NIV84 tagging exists there for online use only |
| 微讀聖經 | https://wd.bible/exegesis | original-language dictionaries by Strong's number | what the course itself teaches students to use |

## Adding a new passage (end-to-end)

1. Add the verse's groups to `.agents/skills/sgbs-strongs-interlinear/scripts/align_fine.py` (copy the pattern;
   dump tokens first — see generator for the bolls/TISCH fetch).
2. Register the passage in `PASSAGES` in `generate_strongs_pages.py` (bolls
   book number, chapter, verse range, NIV book key, BibleHub interlinear URL).
3. `python3 .agents/skills/sgbs-strongs-interlinear/scripts/generate_strongs_pages.py` — Layer 1 must pass.
4. `python3 .agents/skills/sgbs-strongs-interlinear/scripts/audit_alignment.py` — triage **every** flag into a
   written verdict (Layer 2 + 3).
5. `markdownlint` the new page (MD033 exempt; MD013 on unbreakable lines is
   house baseline).
6. `pixi run -e website mkdocs build` — must be error-free.
7. Confirm the 資料來源 section lists all sources with working links.
