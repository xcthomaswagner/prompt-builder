# Experiment Mode – Implementation Task List

> Generated from `EXPERIMENT_MODE_SPEC.md`. Check off tasks as you complete them.

---

## Phase 1: Matrix Testing (MVP)

### 1.1 Utilities & Helpers

- [ ] **T1.1.1** Create `src/lib/cartesian.js` with a `cartesianProduct(arrays)` helper that returns all combinations.
- [ ] **T1.1.2** Write a quick unit test or manual verification for `cartesianProduct`.

### 1.2 UI Components

- [ ] **T1.2.1** Create `src/components/MultiSelectChips.jsx` – a reusable multi-select chip component.
  - Props: `options`, `selected`, `onChange`, `label`.
  - Tailwind styling consistent with existing UI.
- [ ] **T1.2.2** Create `src/components/MatrixSelector.jsx` – wraps three `MultiSelectChips` for Tone, Length, Format.
  - Reads available options from existing config (e.g., `TONES`, `LENGTHS`, `FORMATS` arrays in `App.jsx` or a shared constants file).
  - Exposes `matrixConfig` state: `{ tones: [], lengths: [], formats: [] }`.
- [ ] **T1.2.3** Create `src/components/ResultsGrid.jsx` – displays experiment results in a table/card grid.
  - Columns: Config | Blueprint (collapsible).
  - Accepts `results` array as prop.
  - Each row shows `config` object and a collapsible `<details>` or accordion for `blueprintResult`.

### 1.3 Experiment Runner (Architect-Only)

- [ ] **T1.3.1** Create `src/lib/experimentRunner.js` with:
  ```js
  export async function runMatrixExperiment(prompt, matrixConfig, callGemini, buildPromptPlan) { ... }
  ```
  - Compute cartesian product of `matrixConfig`.
  - For each combo, call `buildPromptPlan()` then `callGemini()`.
  - Return array of `{ config, blueprintResult }`.
- [ ] **T1.3.2** Add progress callback or state so UI can show "Running 3 of 9…".

### 1.4 Main Experiment Mode View

- [ ] **T1.4.1** Create `src/components/ExperimentMode.jsx` – top-level container.
  - State: `originalPrompt`, `matrixConfig`, `results`, `isRunning`, `error`.
  - Renders: prompt textarea, `<MatrixSelector />`, "Run Experiment" button, `<ResultsGrid />`.
- [ ] **T1.4.2** Wire "Run Experiment" button to `runMatrixExperiment()`.
- [ ] **T1.4.3** Show loading spinner / progress indicator while running.
- [ ] **T1.4.4** Handle and display errors gracefully (e.g., API failures).

### 1.5 Navigation / Entry Point

- [ ] **T1.5.1** Add a tab, toggle, or route to switch between normal Prompt Builder and Experiment Mode.
  - Option A: Tab bar in `App.jsx`.
  - Option B: React Router with `/` and `/experiment`.
- [ ] **T1.5.2** Ensure shared state (API key, Firebase auth) is accessible in both modes.

### 1.6 Firestore Persistence

- [ ] **T1.6.1** Define Firestore security rules for `experiments` and `experiment_results` collections (read/write scoped to `userId`).
- [ ] **T1.6.2** On "Run Experiment" start, create an `experiments` doc with `userId`, `originalPrompt`, `matrixConfig`, `createdAt`.
- [ ] **T1.6.3** After each cell completes, write an `experiment_results` doc linked by `experimentId`.
- [ ] **T1.6.4** Add an "Experiment History" list view (similar to existing prompt history) that queries `experiments` by `userId`.

### 1.7 Polish & QA

- [ ] **T1.7.1** Responsive layout for `ResultsGrid` (mobile-friendly).
- [ ] **T1.7.2** Empty state when no experiments exist.
- [ ] **T1.7.3** Manual QA: run a 2×2×2 matrix, verify all 8 results display correctly.
- [ ] **T1.7.4** Commit with message `feat: add Experiment Mode Phase 1 (matrix testing)`.

---

## Phase 2: Executor + Judge Pipeline

### 2.1 LLM Service Abstraction

- [ ] **T2.1.1** Create `src/lib/llmService.js` with `callModel(modelId, systemPrompt, userPrompt)`.
- [ ] **T2.1.2** Move existing `callGemini` logic into `llmService.js` as internal helper.
- [ ] **T2.1.3** Add `callOpenAI(...)` helper (use `VITE_OPENAI_API_KEY`).
- [ ] **T2.1.4** Add `callAnthropic(...)` helper (use `VITE_ANTHROPIC_API_KEY`, optional).
- [ ] **T2.1.5** Export a `SUPPORTED_MODELS` constant listing available model IDs and display names.
- [ ] **T2.1.6** Update `App.jsx` to import `callModel` instead of `callGemini` for normal prompt generation.

### 2.2 Model Selector UI

- [ ] **T2.2.1** Create `src/components/ModelSelector.jsx` – dropdown for selecting a model.
  - Props: `label`, `value`, `onChange`, `models` (from `SUPPORTED_MODELS`).
- [ ] **T2.2.2** Add two `<ModelSelector />` instances to `ExperimentMode.jsx`:
  - Execution Model (default: Gemini).
  - Judge Model (default: Claude or Gemini).

### 2.3 Executor + Judge Logic

- [ ] **T2.3.1** Extend `experimentRunner.js` with `runExperimentCell(combo, prompt, models)`:
  - Architect step (existing).
  - Executor step: call Execution Model with the blueprint.
  - Judge step: call Judge Model with blueprint + result, parse JSON response.
- [ ] **T2.3.2** Define `JUDGE_SYSTEM_PROMPT` constant in `experimentRunner.js`.
- [ ] **T2.3.3** Update `runMatrixExperiment` to accept `models` param and call `runExperimentCell`.

### 2.4 Results Grid Updates

- [ ] **T2.4.1** Add columns to `ResultsGrid`: Result (collapsible) | AI Score | AI Critique.
- [ ] **T2.4.2** Style AI Score with color coding (green ≥7, yellow 4–6, red ≤3).

### 2.5 Firestore Schema Updates

- [ ] **T2.5.1** Extend `experiment_results` writes to include `executionModelId`, `judgeModelId`, `executionResult`, `evaluation.ai`.

### 2.6 QA & Commit

- [ ] **T2.6.1** Manual QA: run a 2×2 matrix with GPT-4o executor and Claude judge.
- [ ] **T2.6.2** Commit with message `feat: add Executor + Judge pipeline (Phase 2)`.

---

## Phase 3: Human Feedback Loop

### 3.1 Star Rating Component

- [ ] **T3.1.1** Create `src/components/StarRating.jsx`.
  - Props: `value`, `onChange`, `max` (default 5).
  - Render clickable stars (Lucide `Star` / `StarHalf` icons or similar).

### 3.2 Feedback Notes Component

- [ ] **T3.2.1** Create `src/components/FeedbackNotes.jsx`.
  - Props: `visible`, `value`, `onChange`, `onSave`.
  - Conditionally render a textarea + Save button.

### 3.3 Integrate into Results Grid

- [ ] **T3.3.1** Add "Human Rating" column to `ResultsGrid` with `<StarRating />`.
- [ ] **T3.3.2** When rating ≤2, show `<FeedbackNotes />` inline or in a popover.
- [ ] **T3.3.3** On rating change or note save, update Firestore `experiment_results` doc with `evaluation.human`.

### 3.4 QA & Commit

- [ ] **T3.4.1** Manual QA: rate several results, verify Firestore writes.
- [ ] **T3.4.2** Commit with message `feat: add human feedback loop (Phase 3)`.

---

## Phase 4 (V2): System Refinement & Versioning

> Deferred. Tasks listed for future planning only.

- [ ] **T4.1** Design `systemPromptVersions` Firestore collection and security rules.
- [ ] **T4.2** Build runtime loader to fetch user's active prompt version on app init.
- [ ] **T4.3** Merge user overrides with global `PROMPT_SPECS`.
- [ ] **T4.4** Add "Refine System" button to result rows.
- [ ] **T4.5** Build Settings → "System Version History" panel with rollback.
- [ ] **T4.6** QA and commit.

---

## Cross-Cutting / Ongoing

- [ ] **TX.1** Update `.env.example` with `VITE_OPENAI_API_KEY` and `VITE_ANTHROPIC_API_KEY` placeholders.
- [ ] **TX.2** Document Experiment Mode in `README.md` (usage, env vars, Firestore setup).
- [ ] **TX.3** Add basic error boundary around Experiment Mode to catch unexpected crashes.
- [ ] **TX.4** Consider rate-limit handling (Open Question #1) – e.g., sequential execution with delay, or user warning for large matrices.
- [ ] **TX.5** Consider cost estimation UI (Open Question #2) – show approximate token/cost before running.

---

## Summary

| Phase | Task Count | Key Deliverable |
|-------|------------|-----------------|
| 1 | 17 | Matrix UI + Architect runs + Firestore |
| 2 | 11 | Multi-model Executor + Judge |
| 3 | 6 | Human ratings + notes |
| 4 | 6 | User-scoped versioning (V2) |
| Cross-cutting | 5 | Docs, env, error handling |

**Total: ~45 tasks**

Start with Phase 1. Let me know when you're ready to begin and I'll help implement task by task.
