# Intelligent Prompt Builder - Technical Deep Dive

## Table of Contents
1. [Blueprint Architecture](#blueprint-architecture)
2. [Prompt Assembly Process](#prompt-assembly-process)
3. [Database Schema & Versioning](#database-schema--versioning)
4. [Template Rendering Engine](#template-rendering-engine)

---

## Blueprint Architecture

### Core Philosophy

The system implements a **compositional prompt architecture** where prompts are assembled from modular, reusable components rather than hardcoded strings. This enables:

- **Separation of concerns**: Prompt logic lives in data structures, not UI code
- **Dynamic composition**: Prompts adapt based on runtime context
- **Conditional rendering**: Different templates activate based on user settings
- **Version control**: Prompt specs can be versioned and A/B tested

### Component Hierarchy

```
PROMPT_SPECS (Registry)
└── [OutputType] (e.g., 'doc', 'comms', 'deck')
    ├── metadata
    │   ├── persona: string
    │   ├── mission: string
    │   ├── guardrails: string[]
    │   ├── enrichment: string[]
    │   └── pipeline: string[]
    ├── systemSteps: Step[]
    │   ├── baseSystemSteps (inherited)
    │   │   ├── persona
    │   │   ├── controls
    │   │   ├── guardrails
    │   │   ├── enrichment
    │   │   └── pipeline
    │   └── systemExtensions (type-specific)
    │       ├── [conditional templates]
    │       └── [format-specific overrides]
    └── userSteps: Step[]
        ├── baseUserSteps (inherited)
        │   ├── user-brief
        │   └── user-notes
        └── userExtensions (type-specific)
```

### Step Structure

Each step in the assembly pipeline has:

```typescript
interface Step {
  id: string;                    // Unique identifier
  channel: 'system' | 'user';    // Which prompt section
  template: string;              // Mustache-style template
  conditions?: Condition[];      // Optional activation rules
}

interface Condition {
  field: string;                 // e.g., 'format.id', 'tone.label'
  operator: '==' | '!=' | 'exists';
  value?: any;
}
```

**Example:**
```javascript
{
  id: 'comms-email-template',
  channel: 'system',
  conditions: [
    { field: 'format.id', operator: '==', value: 'email' }
  ],
  template: 'EMAIL BLUEPRINT ARCHITECT MODE:\n...'
}
```

This step only renders when `format.id === 'email'`.

---

## Prompt Assembly Process

### Phase 1: Spec Selection

**Location:** `App.jsx` → `handleGenerate()`

```javascript
const plan = buildPromptPlan({
  specId: selectedOutputType,  // 'doc', 'comms', etc.
  userInput: inputText,
  tone: toneObj,
  outputType: typeObj,
  format: formatObj,
  length: lengthObj,
  notes,
  toggles: { allowPlaceholders, stripMeta, aestheticMode }
});
```

**What happens:**
1. Retrieves the spec from `PROMPT_SPECS[selectedOutputType]`
2. Falls back to `PROMPT_SPECS.default` if not found
3. Passes all user settings as context

### Phase 2: Context Building

**Location:** `promptAssembler.js` → `buildPromptPlan()`

```javascript
const context = {
  spec: {
    persona: spec.metadata.persona,
    mission: spec.metadata.mission,
    guardrailsList: spec.metadata.guardrails?.map((g, i) => `${i + 1}. ${g}`).join('\n'),
    enrichmentList: spec.metadata.enrichment?.map((e, i) => `${i + 1}. ${e}`).join('\n'),
    pipelineList: spec.metadata.pipeline?.map((p, i) => `${i + 1}. ${p}`).join('\n')
  },
  tone: toneObj,           // { id: 'professional', label: 'Professional', prompt: '...' }
  output: typeObj,         // { id: 'doc', label: 'Doc', context: '...' }
  format: formatObj,       // { id: 'paragraph', label: 'Paragraph', ... }
  length: lengthObj,       // { id: 'medium', label: 'Medium' }
  userInput: userInput,
  notes: notes,
  toggles: {
    allowPlaceholdersLabel: allowPlaceholders ? 'ENABLED' : 'DISABLED',
    stripMetaLabel: stripMeta ? 'YES' : 'NO',
    aestheticModeLabel: aestheticMode ? 'ON' : 'OFF'
  }
};
```

This context object is used for template variable substitution.

### Phase 3: Conditional Filtering

**Location:** `promptAssembler.js` → `shouldIncludeStep()`

For each step, evaluate its conditions:

```javascript
function shouldIncludeStep(step, context) {
  if (!step.conditions || step.conditions.length === 0) {
    return true;  // No conditions = always include
  }
  
  return step.conditions.every(cond => {
    const value = getValueByPath(context, cond.field);
    
    switch (cond.operator) {
      case '==':
        return value === cond.value;
      case '!=':
        return value !== cond.value;
      case 'exists':
        return value != null && value !== '';
      default:
        return false;
    }
  });
}
```

**Example evaluation:**
```javascript
// Step condition:
{ field: 'format.id', operator: '==', value: 'email' }

// Context:
{ format: { id: 'email', label: 'Email' } }

// Result: true → step is included
```

### Phase 4: Template Rendering

**Location:** `promptAssembler.js` → `renderTemplate()`

Uses a simple Mustache-like variable substitution:

```javascript
function renderTemplate(template, context) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getValueByPath(context, path.trim());
    return value != null ? String(value) : '';
  });
}
```

**Example:**
```javascript
// Template:
"Tone: {{tone.label}} ({{tone.prompt}})"

// Context:
{ tone: { label: 'Professional', prompt: 'Formal and clear' } }

// Output:
"Tone: Professional (Formal and clear)"
```

### Phase 5: Block Assembly

**Location:** `promptAssembler.js` → `buildBlocks()`

```javascript
function buildBlocks(steps, context) {
  const lines = [];
  const trace = [];
  
  for (const step of steps) {
    if (!shouldIncludeStep(step, context)) {
      continue;  // Skip if conditions not met
    }
    
    const rendered = renderTemplate(step.template, context);
    lines.push(rendered);
    trace.push({ id: step.id, included: true });
  }
  
  return {
    text: lines.join('\n\n'),
    trace: trace
  };
}
```

### Phase 6: Final Assembly

**Location:** `promptAssembler.js` → `buildPromptPlan()`

```javascript
const system = buildBlocks(spec.systemSteps, context);
const user = buildBlocks(spec.userSteps, context);

return {
  specId: spec.id,
  specVersion: spec.version || 1,
  systemPrompt: system.text,
  userPrompt: user.text || context.userInput,
  stepTrace: [...system.trace, ...user.trace],
  contextSnapshot: context
};
```

### Phase 7: JSON Contract Injection

**Location:** `App.jsx` → `handleGenerate()`

After assembly, the system appends a JSON response contract:

```javascript
const systemPrompt = `${plan.systemPrompt}

CRITICAL JSON RESPONSE CONTRACT:
You MUST return a complete JSON object with ALL THREE sections below.

REQUIRED STRUCTURE:
{
  "analysis": { ... },
  "reverse_prompting": { ... },
  "final_output": {
    "expanded_prompt_text": string,
    "enrichment_attributes_used": string[]
  }
}

CRITICAL: The "final_output" section is MANDATORY.`;
```

This ensures the LLM returns structured output.

---

## Database Schema & Versioning

### Firestore Collection Structure

```
users/
└── {userId}/
    └── prompt_history/
        └── {documentId}
            ├── originalText: string
            ├── finalPrompt: string
            ├── outputType: string
            ├── tone: string
            ├── format: string
            ├── length: string
            ├── createdAt: Timestamp
            ├── isReversePrompted: boolean
            ├── isPrivate: boolean
            ├── signature: string
            ├── version: number
            └── versions: Array<VersionData>
```

### Document Fields

| Field | Type | Purpose |
|-------|------|---------|
| `originalText` | string | User's input brief |
| `finalPrompt` | string | Generated prompt/blueprint (the output) |
| `outputType` | string | 'doc', 'comms', 'deck', etc. |
| `tone` | string | 'professional', 'creative', etc. |
| `format` | string | 'paragraph', 'bullets', 'email', etc. |
| `length` | string | 'short', 'medium', 'long' |
| `createdAt` | Timestamp | Server timestamp of creation/last update |
| `isReversePrompted` | boolean | Whether reverse prompting was triggered |
| `isPrivate` | boolean | User privacy flag |
| `signature` | string | Hash of originalText (for deduplication) |
| `version` | number | Current version number (increments on update) |
| `versions` | Array | Historical snapshots of all versions |

### Version Data Structure

Each item in the `versions` array:

```typescript
interface VersionData {
  originalText: string;
  finalPrompt: string;
  outputType: string;
  tone: string;
  format: string;
  length: string;
  createdAt: string;        // ISO string
  isReversePrompted: boolean;
  signature: string;
}
```

### Signature-Based Deduplication

**Location:** `App.jsx` → `generateSignature()`

```javascript
const generateSignature = (text) => {
  const prefix = text.trim().substring(0, 60).toLowerCase();
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) {
    const char = prefix.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return String(hash);
};
```

**Purpose:** Creates a simple hash from the first 60 characters of the user's input. This allows the system to detect when the user is regenerating a prompt with the same input text.

### Save Logic Flow

**Location:** `App.jsx` → `saveTask()`

```javascript
const saveTask = async () => {
  // 1. Check if we're updating an existing prompt
  let existingItem = historyIdSnapshot
    ? historySnapshot.find(item => item.id === historyIdSnapshot)
    : null;

  // 2. If not found by ID, check by signature
  if (!existingItem) {
    existingItem = historySnapshot.find(item => item.signature === signature);
  }

  // 3. Prepare version data
  const newVersionData = {
    originalText: requestState.originalText,
    finalPrompt: finalPromptText,
    outputType: requestState.outputType,
    tone: requestState.tone,
    format: requestState.format,
    length: requestState.length,
    createdAt: new Date().toISOString(),
    isReversePrompted: isReverse,
    signature
  };

  // 4. Update existing or create new
  if (existingItem) {
    // UPDATE: Increment version, append to versions array
    await updateDoc(doc(db, 'users', user.uid, 'prompt_history', existingItem.id), {
      ...newVersionData,
      createdAt: serverTimestamp(),
      version: (existingItem.version || 1) + 1,
      versions: arrayUnion(newVersionData),  // Append to array
      signature
    });
  } else {
    // CREATE: New document with version 1
    await addDoc(collection(db, 'users', user.uid, 'prompt_history'), {
      ...newVersionData,
      createdAt: serverTimestamp(),
      isPrivate: false,
      version: 1,
      versions: [newVersionData],  // Initialize array
      signature
    });
  }
};
```

### Versioning Strategy

**Scenario 1: New Prompt**
```
User Input: "Explain quantum computing"
Signature: "1234567890"

Result:
{
  id: "abc123",
  originalText: "Explain quantum computing",
  finalPrompt: "# Quantum Computing Explained...",
  version: 1,
  versions: [
    { originalText: "Explain quantum computing", finalPrompt: "...", createdAt: "2024-01-01T10:00:00Z" }
  ],
  signature: "1234567890"
}
```

**Scenario 2: Regenerate Same Prompt (Different Settings)**
```
User Input: "Explain quantum computing" (same)
Tone: Changed from "Professional" to "Creative"
Signature: "1234567890" (same)

Result (UPDATE to abc123):
{
  id: "abc123",
  originalText: "Explain quantum computing",
  finalPrompt: "# Quantum Computing: A Creative Journey...",
  version: 2,  // Incremented
  versions: [
    { originalText: "...", finalPrompt: "...", createdAt: "2024-01-01T10:00:00Z", tone: "professional" },
    { originalText: "...", finalPrompt: "...", createdAt: "2024-01-01T10:05:00Z", tone: "creative" }
  ],
  signature: "1234567890"
}
```

**Scenario 3: Different Prompt**
```
User Input: "Explain blockchain"
Signature: "9876543210" (different)

Result (NEW document):
{
  id: "def456",
  originalText: "Explain blockchain",
  finalPrompt: "# Blockchain Technology...",
  version: 1,
  versions: [
    { originalText: "Explain blockchain", finalPrompt: "...", createdAt: "2024-01-01T10:10:00Z" }
  ],
  signature: "9876543210"
}
```

### Real-Time Sync

**Location:** `App.jsx` → `useEffect()`

```javascript
useEffect(() => {
  if (!user || !db) return;
  
  const q = query(
    collection(db, 'users', user.uid, 'prompt_history'),
    orderBy('createdAt', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    setPromptHistory(items);
  });
  
  return () => unsubscribe();
}, [user]);
```

This creates a real-time listener that automatically updates the UI when:
- New prompts are created
- Existing prompts are updated
- Prompts are deleted

---

## Template Rendering Engine

### Variable Resolution

**Location:** `promptAssembler.js` → `getValueByPath()`

```javascript
function getValueByPath(obj, path) {
  const segments = path.split('.');
  let current = obj;
  
  for (const segment of segments) {
    if (current == null) return undefined;
    current = current[segment];
  }
  
  return current;
}
```

**Example:**
```javascript
getValueByPath(
  { tone: { label: 'Professional' } },
  'tone.label'
)
// Returns: 'Professional'
```

### Conditional Evaluation

**Location:** `promptAssembler.js` → `evaluateCondition()`

```javascript
function evaluateCondition(condition, context) {
  const value = getValueByPath(context, condition.field);
  
  switch (condition.operator) {
    case '==':
      return value === condition.value;
    case '!=':
      return value !== condition.value;
    case 'exists':
      return value != null && value !== '';
    default:
      return false;
  }
}
```

### Step Filtering

Steps are filtered in two passes:

**Pass 1: Condition Evaluation**
```javascript
const activeSteps = steps.filter(step => shouldIncludeStep(step, context));
```

**Pass 2: Template Rendering**
```javascript
const renderedSteps = activeSteps.map(step => renderTemplate(step.template, context));
```

### Output Structure

The final output from `buildPromptPlan()`:

```typescript
interface PromptPlan {
  specId: string;              // 'doc', 'comms', etc.
  specVersion: number;         // Version of the spec used
  systemPrompt: string;        // Assembled system prompt
  userPrompt: string;          // Assembled user prompt
  stepTrace: StepTrace[];      // Which steps were included
  contextSnapshot: Context;    // Full context used for rendering
}

interface StepTrace {
  id: string;
  included: boolean;
}
```

This structure allows for:
- **Debugging**: See which steps were included/excluded
- **Reproducibility**: Store the context snapshot for exact recreation
- **Versioning**: Track which spec version was used

---

## Advanced Features

### 1. Reverse Prompting

When the user's input is too vague (< 15 words), the system can trigger "reverse prompting":

```json
{
  "analysis": {
    "is_vague_or_short": true
  },
  "reverse_prompting": {
    "was_triggered": true,
    "refined_task_text": "Create a comprehensive guide explaining the BMW logo's history...",
    "reasoning": "Original input was too brief to generate a detailed prompt"
  }
}
```

### 2. Multi-Provider Support

The system adapts to different LLM providers:

**Gemini:**
- Uses `responseSchema` with `required` fields
- Forces structured JSON output
- `maxOutputTokens: 4096`

**ChatGPT:**
- Uses `response_format: { type: "json_object" }`
- Relies on system prompt for structure

**Claude:**
- Uses `anthropic-version` header
- Parses JSON from text response

### 3. Error Recovery

**Retry Logic:**
```javascript
let attempts = 0;
const delays = [1000, 2000, 4000, 8000, 16000];

while (attempts <= 5) {
  try {
    // API call
    break;
  } catch (error) {
    if (attempts >= 5) throw error;
    await new Promise(resolve => setTimeout(resolve, delays[attempts]));
    attempts++;
  }
}
```

**Exponential backoff** with up to 5 retries.

---

## Summary

The Intelligent Prompt Builder uses a **compositional architecture** where:

1. **Prompts are data structures** defined in `promptSpecs.js`
2. **Assembly is dynamic** based on user settings and conditional logic
3. **Templates use variable substitution** with Mustache-style syntax
4. **Versioning is signature-based** to track iterations of the same prompt
5. **Storage is hierarchical** in Firestore with real-time sync
6. **Output is structured** using JSON contracts enforced by the LLM API

This architecture enables **maintainability** (prompts are centralized), **extensibility** (new types are easy to add), and **traceability** (full history of prompt evolution).
