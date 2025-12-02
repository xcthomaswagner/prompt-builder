# Intelligent Prompt Builder – Evolution Specification

> Implementation guide for transforming the Prompt Builder from a "prompt assembly tool" to a "prompt strategy advisor"

**Version:** 1.0.0  
**Status:** In Progress  
**Last Updated:** December 2024

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1: Prompt Spec Intermediate Format](#3-phase-1-prompt-spec-intermediate-format)
4. [Phase 2: Split Analysis/Generation Pipeline](#4-phase-2-split-analysisgeneration-pipeline)
5. [Phase 3: Output-Type-Specific Forms](#5-phase-3-output-type-specific-forms)
6. [Phase 4: Inline Quality Feedback](#6-phase-4-inline-quality-feedback)
7. [Phase 5: Reasoning Transparency](#7-phase-5-reasoning-transparency)
8. [Phase 6: Quick-Start Templates](#8-phase-6-quick-start-templates)
9. [Phase 7: Learning Loop](#9-phase-7-learning-loop)
10. [Migration Strategy](#10-migration-strategy)
11. [Success Metrics](#11-success-metrics)

---

## 1. Executive Summary

### Current State

The Prompt Builder is a functional tool that assembles prompts from user-selected options (tone, format, length, output type). It works but operates as a **form-based assembly tool** rather than an intelligent advisor.

### Target State

Transform the Builder into a **prompt strategy advisor** that:

- Infers optimal settings from user goals
- Explains why certain choices work
- Provides real-time quality feedback
- Learns from user outcomes

### Key Changes

| Area | Current | Target |
|------|---------|--------|
| Input Model | Options-first | Goal-first |
| Processing | Single LLM pass | Analysis → Generation pipeline |
| Output | Expanded prompt only | Prompt + reasoning + quality score |
| Feedback | None | Inline quality assessment |
| Learning | None | Outcome tracking |

### Implementation Priority

| Phase | Focus | Timeline | Effort |
|-------|-------|----------|--------|
| 1 | Prompt Spec Format | Week 1-2 | Medium |
| 2 | Split Pipeline | Week 2-3 | Medium |
| 3 | Type-Specific Forms | Week 3-4 | Medium |
| 4 | Inline Quality | Week 4-5 | High |
| 5 | Reasoning Display | Week 5-6 | Low |
| 6 | Templates | Week 6-7 | Low |
| 7 | Learning Loop | Week 7-8 | High |

---

## 2. Architecture Overview

### Current Architecture

```
User Input + Options → Single LLM Pass → Expanded Prompt
```

### Target Architecture

```
User Input + Goal
       ↓
   Analysis LLM  →  Prompt Spec (structured)
       ↓                    ↓
  Generation LLM  ←─────────┘
       ↓
  Quality Judge  →  Feedback
       ↓
  Expanded Prompt + Reasoning + Score
       ↓
  Learning Store  ←  User Outcome
```

### New File Structure

```
src/
├── lib/
│   ├── promptSpecs/
│   │   ├── schema.js           # Base schema definition
│   │   ├── validator.js        # Spec validation
│   │   ├── renderer.js         # Spec → prompt rendering
│   │   └── templates/
│   │       ├── deck.js         # Deck-specific schema
│   │       ├── doc.js          # Doc-specific schema
│   │       ├── code.js         # Code-specific schema
│   │       ├── data.js         # Data-specific schema
│   │       ├── copy.js         # Copy-specific schema
│   │       └── comms.js        # Comms-specific schema
│   ├── pipeline/
│   │   ├── analyzer.js         # Intent analysis LLM call
│   │   ├── generator.js        # Prompt generation LLM call
│   │   └── orchestrator.js     # Pipeline coordination
│   ├── quality/
│   │   ├── judge.js            # Quality assessment
│   │   ├── rubrics.js          # Scoring criteria
│   │   └── feedback.js         # Feedback generation
│   └── learning/
│       ├── outcomeStore.js     # User feedback storage
│       └── preferences.js      # Learned preferences
├── components/
│   ├── TypeSpecificForms/
│   │   ├── DeckForm.jsx
│   │   ├── DocForm.jsx
│   │   ├── CodeForm.jsx
│   │   ├── DataForm.jsx
│   │   ├── CopyForm.jsx
│   │   └── CommsForm.jsx
│   ├── QualityFeedback.jsx     # Inline quality display
│   ├── ReasoningPanel.jsx      # "Why these choices" display
│   ├── TemplateSelector.jsx    # Quick-start templates
│   └── OutcomeFeedback.jsx     # Post-use feedback modal
```

---

## 3. Phase 1: Prompt Spec Intermediate Format

### Objective

Introduce a structured intermediate representation between user input and final prompt generation. This decouples analysis from generation and enables inspection, editing, and learning.

### Base Schema

```javascript
// src/lib/promptSpecs/schema.js

export const SCHEMA_VERSION = '1.0.0';

export const BasePromptSpec = {
  // Metadata
  version: SCHEMA_VERSION,
  outputType: '',           // deck|doc|data|code|copy|comms
  generatedAt: null,
  
  // Intent - What the user wants
  intent: {
    primary_goal: '',           // Core objective
    success_criteria: [],       // How to measure success
    action_desired: '',         // What reader should do after
    urgency: 'normal',          // low|normal|high|critical
  },
  
  // Audience - Who consumes the output
  audience: {
    primary: '',                // Main audience description
    secondary: null,            // Secondary audience if any
    expertise_level: 'general', // novice|general|expert|mixed
    relationship: 'neutral',    // subordinate|peer|superior|customer|public
    expectations: [],           // What they expect to see
  },
  
  // Context - Situational information
  context: {
    setting: '',                // Where/when this will be used
    prior_knowledge: [],        // What audience already knows
    related_materials: [],      // Reference materials
    cultural_notes: '',         // Cultural considerations
  },
  
  // Constraints - Limitations and requirements
  constraints: {
    length: 'medium',           // short|medium|long
    length_specific: null,      // e.g., "500 words" or "10 slides"
    time_to_consume: null,      // e.g., "5 minute read"
    tone_markers: [],           // Tone descriptors
    format_requirements: [],    // Structural requirements
    forbidden: [],              // Things to avoid
    brand_voice: null,          // Brand guidelines reference
  },
  
  // Quality - What good looks like
  quality: {
    must_include: [],           // Required content/topics
    nice_to_have: [],           // Optional enhancements
    differentiation: '',        // What makes this stand out
    anti_patterns: [],          // What to avoid
  },
  
  // Type-specific fields (extended by templates)
  typeSpecific: {},
  
  // Inferred settings (populated by analysis)
  inferred: {
    tone: null,
    format: null,
    length: null,
    reasoning: {},              // Why each choice was made
  },
};
```

### Type-Specific Extensions

#### Deck

```javascript
// src/lib/promptSpecs/templates/deck.js

export const DeckSpec = {
  typeSpecific: {
    slide_count: null,              // Target number of slides
    duration_minutes: null,         // Presentation length
    presentation_context: '',       // keynote|internal|pitch|training
    visual_style: '',               // minimal|data-heavy|image-rich
    include_speaker_notes: true,
    include_visual_suggestions: true,
    slide_structure: [],            // Ordered list of slide types
  },
};
```

#### Code

```javascript
// src/lib/promptSpecs/templates/code.js

export const CodeSpec = {
  typeSpecific: {
    language: '',                   // Programming language
    framework: null,                // Framework if applicable
    include_tests: false,           // Generate test cases
    include_comments: true,         // Inline documentation
    error_handling: 'standard',     // minimal|standard|comprehensive
    style_guide: null,              // Coding style reference
    dependencies: [],               // Required packages
  },
};
```

#### Doc

```javascript
// src/lib/promptSpecs/templates/doc.js

export const DocSpec = {
  typeSpecific: {
    document_type: '',              // report|proposal|guide|analysis
    section_structure: [],          // Required sections
    include_executive_summary: false,
    include_toc: false,
    citation_style: null,           // APA|MLA|Chicago|none
    appendices: [],                 // Supplementary sections
  },
};
```

#### Data

```javascript
// src/lib/promptSpecs/templates/data.js

export const DataSpec = {
  typeSpecific: {
    output_format: 'table',         // table|json|csv|yaml
    schema_definition: null,        // Expected structure
    include_headers: true,
    include_descriptions: false,
    relationships: [],              // Data relationships
    aggregations: [],               // Calculations needed
  },
};
```

#### Copy

```javascript
// src/lib/promptSpecs/templates/copy.js

export const CopySpec = {
  typeSpecific: {
    copy_type: '',                  // ad|landing|email|social|press
    cta_type: null,                 // Call to action style
    emotional_appeal: '',           // fear|aspiration|urgency|trust
    brand_voice: null,              // Brand personality
    word_count: null,               // Target length
    platform: null,                 // Where it will appear
  },
};
```

#### Comms

```javascript
// src/lib/promptSpecs/templates/comms.js

export const CommsSpec = {
  typeSpecific: {
    channel: 'email',               // email|slack|memo|letter
    thread_context: null,           // Reply-to context
    response_urgency: 'normal',     // low|normal|high|asap
    formality_level: 'professional',
    include_greeting: true,
    include_signature: true,
    action_items: [],               // Explicit asks
  },
};
```

### Validation

```javascript
// src/lib/promptSpecs/validator.js

export function validateSpec(spec) {
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!spec.version) errors.push('Missing version');
  if (!spec.outputType) errors.push('Missing outputType');
  if (!spec.intent?.primary_goal) errors.push('Missing intent.primary_goal');
  
  // Version compatibility
  if (spec.version !== SCHEMA_VERSION) {
    warnings.push(`Spec version ${spec.version} differs from current ${SCHEMA_VERSION}`);
  }
  
  // Type-specific validation
  const typeValidator = typeValidators[spec.outputType];
  if (typeValidator) {
    const typeResult = typeValidator(spec.typeSpecific);
    errors.push(...typeResult.errors);
    warnings.push(...typeResult.warnings);
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

### Deliverables

- [ ] `src/lib/promptSpecs/schema.js` - Base schema with JSDoc types
- [ ] `src/lib/promptSpecs/templates/*.js` - Type-specific extensions
- [ ] `src/lib/promptSpecs/validator.js` - Validation logic
- [ ] `src/lib/promptSpecs/index.js` - Public API exports
- [ ] Unit tests for schema creation and validation

---

## 4. Phase 2: Split Analysis/Generation Pipeline

### Objective

Separate intent analysis from prompt generation for better quality and transparency. The analysis step focuses on understanding; the generation step focuses on crafting.

### Analysis Step

**Input:** User's raw input + selected output type  
**Output:** Populated Prompt Spec with inferred settings and reasoning

```javascript
// src/lib/pipeline/analyzer.js

export async function analyzeIntent(input, options = {}) {
  const { userInput, notes, outputType } = input;
  
  const analysisPrompt = `
You are analyzing a user's request to understand their true intent.

## User Input
"${userInput}"

${notes ? `## Additional Notes\n${notes}` : ''}

## Selected Output Type
${outputType.label}: ${outputType.context}

## Your Task
Analyze this request deeply:

1. **Primary Goal**: What is the user really trying to achieve?
2. **Success Criteria**: How will they know the output is good?
3. **Audience**: Who will consume this? What do they expect?
4. **Context**: What situation is this for?
5. **Recommended Settings**: What tone/format/length and WHY?

Return your analysis as JSON matching the PromptSpec schema.
`;

  const response = await callLLM(analysisPrompt, {
    responseFormat: 'json',
    temperature: 0.3,  // Lower temperature for consistent analysis
  });
  
  return parseAnalysisResponse(response);
}
```

### Generation Step

**Input:** Validated Prompt Spec  
**Output:** Expanded prompt + structure summary + key elements

```javascript
// src/lib/pipeline/generator.js

export async function generatePrompt(spec, options = {}) {
  const generationPrompt = `
You are generating a high-quality prompt based on a detailed specification.

## Prompt Specification
${JSON.stringify(spec, null, 2)}

## Your Task
Generate an expanded prompt that:
1. Addresses the primary goal directly
2. Is tailored to the specified audience
3. Follows format and structural requirements
4. Maintains the specified tone throughout
5. Includes all must-have content
6. Avoids all anti-patterns

Return: { expanded_prompt, structure_summary, key_elements }
`;

  const response = await callLLM(generationPrompt, {
    responseFormat: 'json',
    temperature: 0.7,  // Higher temperature for creative generation
  });
  
  return parseGenerationResponse(response);
}
```

### Orchestrator

```javascript
// src/lib/pipeline/orchestrator.js

export async function runPipeline(input, options = {}) {
  const { skipAnalysis = false, skipQuality = false, userOverrides = {} } = options;
  
  // Step 1: Analysis
  let spec;
  if (skipAnalysis && input.existingSpec) {
    spec = input.existingSpec;
  } else {
    const analysis = await analyzeIntent(input);
    spec = buildSpecFromAnalysis(analysis, input);
  }
  
  // Step 2: Apply user overrides
  spec = applyOverrides(spec, userOverrides);
  
  // Step 3: Validate
  const validation = validateSpec(spec);
  if (!validation.valid) {
    throw new SpecValidationError(validation.errors);
  }
  
  // Step 4: Generation
  const generation = await generatePrompt(spec);
  
  // Step 5: Quality Assessment (optional)
  let quality = null;
  if (!skipQuality) {
    quality = await assessQuality(generation.expanded_prompt, spec);
  }
  
  return {
    spec,
    expandedPrompt: generation.expanded_prompt,
    structure: generation.structure_summary,
    keyElements: generation.key_elements,
    quality,
    reasoning: spec.inferred?.reasoning || {},
  };
}
```

### Deliverables

- [ ] `src/lib/pipeline/analyzer.js` - Intent analysis
- [ ] `src/lib/pipeline/generator.js` - Prompt generation
- [ ] `src/lib/pipeline/orchestrator.js` - Pipeline coordination
- [ ] Integration with existing `callLLM` infrastructure
- [ ] Feature flag for gradual rollout

---

## 5. Phase 3: Output-Type-Specific Forms

### Objective

Replace generic tone/format/length options with tailored forms for each output type.

### Form Components

Each output type gets a dedicated form with relevant options:

| Output Type | Specific Options |
|-------------|------------------|
| **Deck** | Slide count, duration, context (keynote/internal/pitch), speaker notes toggle |
| **Code** | Language, framework, include tests, error handling level |
| **Doc** | Document type, section structure, executive summary, citations |
| **Data** | Output format (table/JSON/CSV), schema definition |
| **Copy** | Copy type, CTA style, emotional appeal, platform |
| **Comms** | Channel, urgency, formality, action items |

### Example: DeckForm

```jsx
// src/components/TypeSpecificForms/DeckForm.jsx

export default function DeckForm({ spec, onChange }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-700">Deck Settings</h3>
      
      <FormField label="Target Slides">
        <input
          type="number"
          min="3" max="50"
          value={spec.typeSpecific.slide_count || ''}
          onChange={(e) => onChange('typeSpecific.slide_count', parseInt(e.target.value))}
          placeholder="Auto"
        />
      </FormField>
      
      <FormField label="Duration">
        <select
          value={spec.typeSpecific.duration_minutes || ''}
          onChange={(e) => onChange('typeSpecific.duration_minutes', parseInt(e.target.value))}
        >
          <option value="">Auto</option>
          <option value="5">5 min (Lightning)</option>
          <option value="15">15 min (Standard)</option>
          <option value="30">30 min (Deep dive)</option>
          <option value="60">60 min (Workshop)</option>
        </select>
      </FormField>
      
      <FormField label="Context">
        <ButtonGroup
          options={['keynote', 'internal', 'pitch', 'training']}
          value={spec.typeSpecific.presentation_context}
          onChange={(v) => onChange('typeSpecific.presentation_context', v)}
        />
      </FormField>
      
      <div className="flex gap-4">
        <Checkbox
          label="Speaker Notes"
          checked={spec.typeSpecific.include_speaker_notes !== false}
          onChange={(v) => onChange('typeSpecific.include_speaker_notes', v)}
        />
        <Checkbox
          label="Visual Suggestions"
          checked={spec.typeSpecific.include_visual_suggestions !== false}
          onChange={(v) => onChange('typeSpecific.include_visual_suggestions', v)}
        />
      </div>
    </div>
  );
}
```

### Form Router

```jsx
// src/components/TypeSpecificForms/index.jsx

const forms = {
  deck: DeckForm,
  doc: DocForm,
  code: CodeForm,
  data: DataForm,
  copy: CopyForm,
  comms: CommsForm,
};

export default function TypeSpecificForm({ outputType, spec, onChange }) {
  const FormComponent = forms[outputType];
  if (!FormComponent) return null;
  return <FormComponent spec={spec} onChange={onChange} />;
}
```

### Deliverables

- [ ] `src/components/TypeSpecificForms/DeckForm.jsx`
- [ ] `src/components/TypeSpecificForms/DocForm.jsx`
- [ ] `src/components/TypeSpecificForms/CodeForm.jsx`
- [ ] `src/components/TypeSpecificForms/DataForm.jsx`
- [ ] `src/components/TypeSpecificForms/CopyForm.jsx`
- [ ] `src/components/TypeSpecificForms/CommsForm.jsx`
- [ ] `src/components/TypeSpecificForms/index.jsx` - Router
- [ ] Shared form components (FormField, ButtonGroup, Checkbox)

---

## 6. Phase 4: Inline Quality Feedback

### Objective

Provide real-time quality assessment for every generated prompt.

### Quality Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Structure** | 20% | Clear organization, logical flow |
| **Specificity** | 25% | Concrete details, avoids vagueness |
| **Actionability** | 25% | Clear instructions, measurable outcomes |
| **Tone Alignment** | 15% | Consistent, matches specification |
| **Completeness** | 15% | All required elements present |

### Quality Judge

```javascript
// src/lib/quality/judge.js

export async function assessQuality(expandedPrompt, spec) {
  const rubric = getRubric(spec.outputType);
  
  const assessmentPrompt = `
Evaluate this prompt against specific criteria.

## Generated Prompt
${expandedPrompt}

## Specification
${JSON.stringify(spec, null, 2)}

## Rubric
${JSON.stringify(rubric, null, 2)}

Score each dimension 1-10 with specific feedback.

Return JSON:
{
  "overall_score": 0-100,
  "dimensions": {
    "structure": { "score": 1-10, "feedback": "..." },
    "specificity": { "score": 1-10, "feedback": "..." },
    "actionability": { "score": 1-10, "feedback": "..." },
    "tone_alignment": { "score": 1-10, "feedback": "..." },
    "completeness": { "score": 1-10, "feedback": "..." }
  },
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}
`;

  return await callLLM(assessmentPrompt, { temperature: 0.2 });
}
```

### Display Component

```jsx
// src/components/QualityFeedback.jsx

export default function QualityFeedback({ quality, onImprove }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-slate-50 rounded-lg border p-4">
      {/* Summary: score bar + dimension icons */}
      <div className="flex items-center justify-between">
        <ScoreBar score={quality.overall_score} />
        <ExpandButton onClick={() => setExpanded(!expanded)} />
      </div>
      
      <DimensionBadges dimensions={quality.dimensions} />
      
      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <StrengthsList items={quality.strengths} />
          <ImprovementsList items={quality.improvements} />
          <button onClick={onImprove}>Auto-Improve</button>
        </div>
      )}
    </div>
  );
}
```

### Deliverables

- [ ] `src/lib/quality/judge.js` - Quality assessment
- [ ] `src/lib/quality/rubrics.js` - Scoring criteria
- [ ] `src/components/QualityFeedback.jsx` - Display
- [ ] Auto-improve functionality
- [ ] Integration with Judge v2 baseline system

---

## 7. Phase 5: Reasoning Transparency

### Objective

Show users why the Builder made specific choices.

### Component

```jsx
// src/components/ReasoningPanel.jsx

export default function ReasoningPanel({ reasoning, inferredSettings }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-4">
      <button onClick={() => setExpanded(!expanded)}>
        <Lightbulb /> Why these settings?
      </button>
      
      {expanded && (
        <div className="mt-4 space-y-3">
          <SettingsTags settings={inferredSettings} />
          
          {Object.entries(reasoning).map(([key, explanation]) => (
            <div key={key}>
              <strong>{key}:</strong> {explanation}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Deliverables

- [ ] `src/components/ReasoningPanel.jsx`
- [ ] Integration with pipeline reasoning output

---

## 8. Phase 6: Quick-Start Templates

### Objective

Reduce blank-page anxiety with pre-configured starting points.

### Template Library

| Template | Output Type | Key Settings |
|----------|-------------|--------------|
| Quarterly Business Review | Deck | 12 slides, 30 min, internal |
| Cold Outreach Email | Comms | Short, professional |
| Technical Blog Post | Doc | Long, instructive, with TOC |
| API Documentation | Code | Comprehensive errors |
| Product Launch Deck | Deck | 15 slides, keynote, creative |
| Meeting Summary | Doc | Medium, structured sections |

### Template Definition

```javascript
// src/lib/templates/quickStart.js

export const quickStartTemplates = [
  {
    id: 'quarterly-review',
    label: 'Quarterly Business Review',
    icon: 'BarChart',
    outputType: 'deck',
    description: 'Executive presentation of quarterly performance',
    defaults: {
      typeSpecific: {
        slide_count: 12,
        duration_minutes: 30,
        presentation_context: 'internal',
      },
      constraints: {
        tone_markers: ['professional', 'data-driven'],
      },
    },
    exampleInput: 'Q3 2024 performance review for the executive team',
  },
  // ... more templates
];
```

### Deliverables

- [ ] `src/lib/templates/quickStart.js` - Template definitions
- [ ] `src/components/TemplateSelector.jsx` - Selection UI
- [ ] Integration with main form

---

## 9. Phase 7: Learning Loop

### Objective

Capture user outcomes to improve recommendations over time.

### Outcome Schema

```javascript
{
  promptId: '',
  specSnapshot: {},
  rating: 'positive' | 'negative',
  outcome: 'used_as_is' | 'small_edits' | 'major_edits' | 'abandoned',
  editsNeeded: [],
  feedback: '',
  createdAt: null,
}
```

### Outcome Capture

```javascript
// src/lib/learning/outcomeStore.js

export async function recordOutcome(db, userId, outcome) {
  await addDoc(collection(db, 'users', userId, 'prompt_outcomes'), {
    ...outcome,
    createdAt: serverTimestamp(),
  });
  
  // Trigger preference learning
  learnFromOutcome(db, userId, outcome);
}
```

### Preference Learning

```javascript
// src/lib/learning/preferences.js

export async function learnFromOutcome(db, userId, outcome) {
  const preferences = await getUserPreferences(db, userId);
  
  if (outcome.rating === 'positive' && outcome.outcome === 'used_as_is') {
    // Reinforce these settings
    incrementSuccessCount(preferences, outcome.specSnapshot);
  }
  
  if (outcome.rating === 'negative') {
    // Learn what to avoid
    preferences.commonIssues.push(...outcome.editsNeeded);
  }
  
  await saveUserPreferences(db, userId, preferences);
}
```

### Deliverables

- [ ] `src/lib/learning/outcomeStore.js`
- [ ] `src/lib/learning/preferences.js`
- [ ] `src/components/OutcomeFeedback.jsx`
- [ ] Trigger mechanism (after copy or timeout)

---

## 10. Migration Strategy

### Backward Compatibility

- Existing prompts continue to work
- Legacy input auto-converts to Prompt Spec
- New features are additive

### Feature Flags

```javascript
// src/lib/featureFlags.js

export const FLAGS = {
  USE_SPLIT_PIPELINE: false,
  SHOW_TYPE_SPECIFIC_FORMS: false,
  SHOW_QUALITY_FEEDBACK: false,
  SHOW_REASONING_PANEL: false,
  SHOW_TEMPLATES: false,
  ENABLE_LEARNING_LOOP: false,
};
```

### Rollout Plan

| Week | Milestone | Flag |
|------|-----------|------|
| 1-2 | Prompt Spec schema | None (internal) |
| 3 | Split pipeline | `USE_SPLIT_PIPELINE` |
| 4 | Deck + Code forms | `SHOW_TYPE_SPECIFIC_FORMS` |
| 5 | Quality feedback | `SHOW_QUALITY_FEEDBACK` |
| 6 | Remaining forms + reasoning | `SHOW_REASONING_PANEL` |
| 7 | Templates | `SHOW_TEMPLATES` |
| 8 | Learning loop | `ENABLE_LEARNING_LOOP` |

---

## 11. Success Metrics

### Primary Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Prompt quality score | N/A | 80+ avg | Quality judge |
| "Used as-is" rate | Unknown | 60%+ | Outcome feedback |
| Time to first prompt | ~60s | ~30s | Analytics |
| Return usage | Unknown | 3x/week | User sessions |

### Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Template usage | 40% of sessions | Click tracking |
| Quality feedback expansion | 30% click rate | UI analytics |
| Reasoning panel views | 20% click rate | UI analytics |
| Outcome feedback completion | 25% of prompts | Submission rate |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Prompt Spec** | Structured intermediate representation of user intent |
| **Analysis Step** | LLM call that understands intent and infers settings |
| **Generation Step** | LLM call that produces the expanded prompt |
| **Quality Judge** | LLM-based assessment of prompt quality |
| **Outcome** | User feedback on how well the prompt worked |

---

## Appendix B: Related Documents

- `LLM_FUNCTIONAL_SPEC.md` - Current LLM system prompt specification
- `COMBINATION_MATRIX.md` - Output type × tone × format analysis
- `src/lib/promptSpecs.js` - Existing prompt specs
- `src/lib/promptAssembler.js` - Existing assembler

---

*This specification is a living document. Update as implementation progresses.*
