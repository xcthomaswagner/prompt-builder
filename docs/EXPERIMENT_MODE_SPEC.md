# Feature Specification: Experiment Mode (Adjusted)

## 1. Overview

**Experiment Mode** is a testing environment that lets users systematically validate prompt architecture by running matrix combinations of settings, executing generated blueprints against frontier LLMs, and capturing both AI and human evaluations.

### Key Objectives

- **Matrix Testing:** Run combinations of Tone × Length × Format in parallel.
- **Execution Validation:** Execute generated Blueprints against selectable Frontier Models (Gemini, Claude, GPT).
- **Automated Evaluation:** Use a separate "Judge Model" to critique output adherence to Blueprint constraints.
- **Dataset Creation:** Capture human and AI ratings to refine the Prompt Architect system over time.

### Phased Delivery

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Matrix UI + Architect-only runs (Gemini) | Target |
| **Phase 2** | Multi-model Executor + Judge pipeline | Future |
| **Phase 3** | Human feedback loop (ratings, notes) | Future |
| **Phase 4** | User-scoped prompt versioning & rollback | V2 |

---

## 2. Phase 1: Matrix Testing (MVP)

### 2.1 User Experience

1. **Input:** User enters the Original Prompt.
2. **Matrix Selection:** Multi-select chips for Tones, Lengths, and Formats.
3. **Action:** Click **"Run Experiment"**.
4. **Output:** A grid/table showing each combination's generated Blueprint.

### 2.2 Functional Requirements

- **FR1.1** – Multi-select UI for tone, length, and format (chips or checkboxes).
- **FR1.2** – Compute cartesian product of selected options.
- **FR1.3** – For each combo, call `buildPromptPlan()` then `callGemini()` (Architect step).
- **FR1.4** – Display results in a comparative grid with columns: Config | Blueprint (collapsible).
- **FR1.5** – Persist experiment metadata to Firestore (`experiments` collection).

### 2.3 Data Model

**Collection: `experiments`**

```ts
{
  id: string,
  userId: string,
  originalPrompt: string,
  matrixConfig: {
    tones: string[],
    lengths: string[],
    formats: string[]
  },
  createdAt: Timestamp
}
```

**Collection: `experiment_results`**

```ts
{
  id: string,
  experimentId: string,
  config: { tone: string, length: string, format: string },
  blueprintResult: string,
  createdAt: Timestamp
}
```

---

## 3. Phase 2: Executor + Judge Pipeline

### 3.1 Prerequisites

- **LLM Service Abstraction:** Replace hardcoded `callGemini` with a generic `callModel(modelId, systemPrompt, userPrompt)` that routes to Gemini, OpenAI, or Anthropic based on `modelId`.
- **API Keys:** Ensure `VITE_OPENAI_API_KEY` and (optionally) `VITE_ANTHROPIC_API_KEY` are available.

### 3.2 User Experience

1. **Model Selection:**
   - **Execution Model:** Dropdown (e.g., Gemini 1.5 Pro, GPT-4o).
   - **Judge Model:** Dropdown (e.g., Claude 3.5 Sonnet).
2. **Execution Pipeline (per combo):**
   - **Architect:** Generate Blueprint.
   - **Executor:** Send Blueprint to Execution Model → get Result.
   - **Judge:** Send Blueprint + Result to Judge Model → get Score + Critique.
3. **Output Grid Columns:** Config | Blueprint | Result | AI Score | AI Critique.

### 3.3 Judge Prompt (Model-Agnostic)

```text
You are an impartial evaluator. Compare the OUTPUT against the BLUEPRINT's stated constraints (tone, format, length, structure).

Return JSON only:
{
  "score": <1-10>,
  "critique": "<1-sentence analysis>"
}
```

### 3.4 Data Model Updates

Extend `experiment_results`:

```ts
{
  ...Phase1Fields,
  executionModelId: string,
  judgeModelId: string,
  executionResult: string,
  evaluation: {
    ai: { score: number, critique: string }
  }
}
```

### 3.5 Service Layer (Pseudo-Code)

```js
// src/lib/llmService.js
export async function callModel(modelId, systemPrompt, userPrompt) {
  switch (modelId) {
    case 'gemini-1.5-pro':
    case 'gemini-2.5-flash':
      return callGemini(userPrompt, systemPrompt, geminiApiKey);
    case 'gpt-4o':
      return callOpenAI(userPrompt, systemPrompt, openAiApiKey);
    case 'claude-3-5-sonnet':
      return callAnthropic(userPrompt, systemPrompt, anthropicApiKey);
    default:
      throw new Error(`Unknown model: ${modelId}`);
  }
}

// src/lib/experimentRunner.js
export async function runExperimentCell(combo, prompt, models) {
  // 1. Architect
  const plan = buildPromptPlan({ ...combo, userInput: prompt });
  const blueprint = await callModel(models.architectModel, plan.systemPrompt, plan.userPrompt);

  // 2. Executor
  const executionResult = await callModel(models.executionModel, '', blueprint.final_output.expanded_prompt_text);

  // 3. Judge
  const judgePrompt = `Blueprint:\n${blueprint.final_output.expanded_prompt_text}\n\nResult:\n${executionResult}\n\nTask: Rate adherence (1-10) and critique. Return JSON.`;
  const judgeResult = await callModel(models.judgeModel, JUDGE_SYSTEM_PROMPT, judgePrompt);

  return { blueprint, executionResult, aiEvaluation: JSON.parse(judgeResult) };
}
```

---

## 4. Phase 3: Human Feedback Loop

### 4.1 User Experience

- Each result row includes a **Star Rating (1–5)** component.
- Clicking a rating (especially ≤2) opens an optional **Correction Notes** text input.
- Ratings and notes are saved immediately to Firestore.

### 4.2 Data Model Updates

Extend `experiment_results.evaluation`:

```ts
evaluation: {
  ai: { score: number, critique: string },
  human: { rating: number, notes: string }
}
```

### 4.3 UI Components

- `<StarRating value={rating} onChange={...} />`
- `<FeedbackNotes visible={rating <= 2} onSave={...} />`

---

## 5. Phase 4 (V2): System Refinement & Versioning

> **Deferred to V2.** This section is included for future planning but is out of scope for the initial release.

### 5.1 Concept

- Users can mark a result as **Golden Sample** (high rating) or **Critical Failure** (low rating).
- Clicking **"Refine System"** creates a **user-scoped fork** of the system prompt.
- Forks are versioned and immutable; users can rollback via a Version History UI.

### 5.2 Data Model (Future)

**Collection: `systemPromptVersions`**

```ts
{
  id: string,
  userId: string,
  version: number,
  specId: string,
  systemSteps: Step[],
  userSteps: Step[],
  changeLog: string,
  createdAt: Timestamp,
  isActive: boolean
}
```

### 5.3 Runtime Behavior (Future)

- On app load, fetch the user's active `systemPromptVersions` doc (if any).
- Merge user overrides with global `PROMPT_SPECS` at runtime.
- Provide a Settings → "System Version History" panel for rollback.

---

## 6. Technical Prerequisites (All Phases)

| Prerequisite | Phase | Notes |
|--------------|-------|-------|
| Multi-select chip UI component | 1 | New or library (e.g., Headless UI) |
| Cartesian product utility | 1 | Simple JS helper |
| `experiments` + `experiment_results` Firestore collections | 1 | Schema as defined |
| `llmService.js` abstraction | 2 | Route to Gemini/OpenAI/Anthropic |
| `VITE_ANTHROPIC_API_KEY` env var | 2 | Optional for Claude |
| Star rating component | 3 | New UI component |
| `systemPromptVersions` collection + runtime loader | 4 | V2 |

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Time to run a 3×3 matrix experiment | < 60s |
| Judge score correlation with human rating | > 0.7 |
| User adoption of feedback loop | > 50% of experiments rated |

---

## 8. Open Questions

1. **Rate limiting:** How do we handle API rate limits when running large matrices (e.g., 5×5×3 = 75 calls)?
2. **Cost visibility:** Should we show estimated API cost before running an experiment?
3. **Partial failures:** If one cell fails, do we retry, skip, or abort the whole experiment?

---

## Appendix: File Locations (Proposed)

| File | Purpose |
|------|---------|
| `src/lib/llmService.js` | Multi-provider LLM abstraction |
| `src/lib/experimentRunner.js` | Orchestrates Architect → Executor → Judge |
| `src/components/ExperimentMode.jsx` | Main experiment UI |
| `src/components/MatrixSelector.jsx` | Multi-select chips for tone/format/length |
| `src/components/ResultsGrid.jsx` | Comparative results table |
| `src/components/StarRating.jsx` | Human rating component |
| `docs/EXPERIMENT_MODE_SPEC.md` | This document |
