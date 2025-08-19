# BDSM Archetype Quiz — Reboot

This bundle was generated from your DOCX source files and includes:

- `index.html`, `styles.css`, `quiz.js`
- `results.html`, `results.js`, `quiz_data.json`
- `quiz_sections/*.json` (open-ended items removed)

### How scoring works (v2025-08-19)
- Likert items with recognizable **positive→negative** option sequences score toward the question's `archetype` (leftmost = highest).
- Numeric scales are normalized from min→max (higher = more of the tagged archetype).
- Multiple choice items are currently treated as **neutral** (no score) unless we define per-option alignments in a future `scoring_overrides.json`.

> This keeps results stable now and gives us an easy switch to fine-tune later without changing the survey text.

### What you may want to do next
1. **Review ambiguous items** (e.g., “planning vs diving in”). If we want these to count, either:
   - Rephrase as an agree/disagree statement *for* the archetype, **or**
   - Add per-question orientation in a `scoring_overrides.json` we can create together.

2. **Narrative coverage** — make sure `quiz_data.json` has complete descriptions, affirmations, insights, and reflection prompts for all archetypes.

3. **Assets** — place any images into `assets/` and reference them in `results.html` if desired.

### Privacy
All computation stays in-browser. Nothing is sent to a server unless you add one.
