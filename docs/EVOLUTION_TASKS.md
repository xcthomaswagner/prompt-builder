# Evolution Implementation Tasks

> Checklist for implementing EVOLUTION_SPEC.md with atomic, reversible commits

## Git Strategy

Each phase gets its own feature branch. Commits are atomic and can be reverted individually.

```bash
# To revert a specific phase:
git revert <commit-hash>

# To revert an entire phase branch:
git revert --no-commit <first-commit>..<last-commit>
git commit -m "revert: Phase X - <reason>"
```

---

## Phase 1: Prompt Spec Intermediate Format ✅ COMPLETE

**Branch:** `feat/phase1-prompt-spec-schema` (merged)

- [x] 1.1 Create base schema (`src/lib/promptSpecs/schema.js`)
- [x] 1.2 Create Deck template (`src/lib/promptSpecs/templates/deck.js`)
- [x] 1.3 Create Code template (`src/lib/promptSpecs/templates/code.js`)
- [x] 1.4 Create Doc template (`src/lib/promptSpecs/templates/doc.js`)
- [x] 1.5 Create Data template (`src/lib/promptSpecs/templates/data.js`)
- [x] 1.6 Create Copy template (`src/lib/promptSpecs/templates/copy.js`)
- [x] 1.7 Create Comms template (`src/lib/promptSpecs/templates/comms.js`)
- [x] 1.8 Create validator (`src/lib/promptSpecs/validator.js`)
- [x] 1.9 Create index exports (`src/lib/promptSpecs/index.js`)
- [x] 1.10 Merge to main

---

## Phase 2: Split Analysis/Generation Pipeline ✅ COMPLETE

**Branch:** `feat/phase2-split-pipeline` (merged)

- [x] 2.1 Create analyzer (`src/lib/pipeline/analyzer.js`)
- [x] 2.2 Create generator (`src/lib/pipeline/generator.js`)
- [x] 2.3 Create orchestrator (`src/lib/pipeline/orchestrator.js`)
- [x] 2.4 Add feature flag (`src/lib/featureFlags.js`)
- [ ] 2.5 Integrate with App.jsx (behind flag) - *deferred to Phase 3*
- [x] 2.6 Merge to main

---

## Phase 3: Output-Type-Specific Forms ✅ COMPLETE

**Branch:** `feat/phase3-type-specific-forms` (merged)

- [x] 3.1 Create shared form components (`src/components/ui/FormField.jsx`, etc.)
- [x] 3.2 Create DeckForm (`src/components/TypeSpecificForms/DeckForm.jsx`)
- [x] 3.3 Create CodeForm (`src/components/TypeSpecificForms/CodeForm.jsx`)
- [x] 3.4 Create DocForm (`src/components/TypeSpecificForms/DocForm.jsx`)
- [x] 3.5 Create DataForm (`src/components/TypeSpecificForms/DataForm.jsx`)
- [x] 3.6 Create CopyForm (`src/components/TypeSpecificForms/CopyForm.jsx`)
- [x] 3.7 Create CommsForm (`src/components/TypeSpecificForms/CommsForm.jsx`)
- [x] 3.8 Create form router (`src/components/TypeSpecificForms/index.jsx`)
- [ ] 3.9 Integrate with App.jsx (behind flag) - *deferred*
- [x] 3.10 Merge to main

---

## Phase 4: Inline Quality Feedback ✅ COMPLETE

**Branch:** `feat/phase4-quality-feedback` (merged)

- [x] 4.1 Create rubrics (`src/lib/quality/rubrics.js`)
- [x] 4.2 Create judge (`src/lib/quality/judge.js`)
- [x] 4.3 Create QualityFeedback component (`src/components/QualityFeedback.jsx`)
- [x] 4.4 Add auto-improve functionality (in component)
- [ ] 4.5 Integrate with pipeline - *deferred*
- [x] 4.6 Merge to main

---

## Phase 5: Reasoning Transparency

**Branch:** `feat/phase5-reasoning-panel`

- [ ] 5.1 Create ReasoningPanel component (`src/components/ReasoningPanel.jsx`)
- [ ] 5.2 Integrate with App.jsx
- [ ] 5.3 Merge to main

---

## Phase 6: Quick-Start Templates

**Branch:** `feat/phase6-templates`

- [ ] 6.1 Create template definitions (`src/lib/templates/quickStart.js`)
- [ ] 6.2 Create TemplateSelector component (`src/components/TemplateSelector.jsx`)
- [ ] 6.3 Integrate with App.jsx
- [ ] 6.4 Merge to main

---

## Phase 7: Learning Loop

**Branch:** `feat/phase7-learning-loop`

- [ ] 7.1 Create outcome store (`src/lib/learning/outcomeStore.js`)
- [ ] 7.2 Create preferences module (`src/lib/learning/preferences.js`)
- [ ] 7.3 Create OutcomeFeedback component (`src/components/OutcomeFeedback.jsx`)
- [ ] 7.4 Integrate with App.jsx
- [ ] 7.5 Merge to main

---

## Revert Commands Reference

```bash
# Revert Phase 1
git revert $(git log --oneline --grep="phase1" | awk '{print $1}' | tac)

# Revert Phase 2
git revert $(git log --oneline --grep="phase2" | awk '{print $1}' | tac)

# etc.
```

---

*Updated: November 2024*
