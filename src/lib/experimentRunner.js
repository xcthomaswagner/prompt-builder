import { buildMatrixCombos } from './cartesian';
import buildPromptPlan from './promptAssembler';
import { callModel, parseJsonResponse } from './llmService';

/**
 * Lookup tables for tones, lengths, formats.
 * These mirror the definitions in App.jsx.
 */
const TONES = [
  { id: 'professional', label: 'Professional', prompt: 'formal, objective, and expert' },
  { id: 'creative', label: 'Creative', prompt: 'imaginative, evocative, and storytelling' },
  { id: 'academic', label: 'Academic', prompt: 'rigorous, citation-focused, and analytical' },
  { id: 'casual', label: 'Casual', prompt: 'friendly, conversational, and accessible' },
  { id: 'instructive', label: 'Instructive', prompt: 'didactic, step-by-step teacher' }
];

const LENGTHS = [
  { id: 'short', label: 'Short', prompt: 'Concise and high-level' },
  { id: 'medium', label: 'Medium', prompt: 'Balanced detail' },
  { id: 'long', label: 'Long', prompt: 'Exhaustive and detailed' }
];

const FORMATS = [
  { id: 'paragraph', label: 'Paragraph', prompt: 'Flowing, cohesive narrative' },
  { id: 'bullets', label: 'Bullet Points', prompt: 'Concise bulleted list' },
  { id: 'numbered', label: 'Numbered List', prompt: 'Sequential numbered list' },
  { id: 'steps', label: 'Step-by-Step', prompt: 'Clear, actionable steps' },
  { id: 'sections', label: 'Structured Sections', prompt: 'Clear, hierarchical sections with headings' },
  { id: 'email', label: 'Email', prompt: 'Professional email format' },
  { id: 'table', label: 'Table', prompt: 'Structured table with headers' },
  { id: 'qa', label: 'Q&A', prompt: 'Question and Answer session' }
];

const OUTPUT_TYPES = [
  { id: 'deck', label: 'Deck', context: 'Slide Deck Outline (Titles, Visuals, Notes)' },
  { id: 'doc', label: 'Doc', context: 'Comprehensive Written Document' },
  { id: 'data', label: 'Data', context: 'Structured Data / Tables' },
  { id: 'code', label: 'Code', context: 'Production-Ready Code' },
  { id: 'copy', label: 'Copy', context: 'Marketing Copy / Creative Writing' },
  { id: 'comms', label: 'Comms', context: 'Email / Communication' }
];

/**
 * Judge system prompt for evaluating output quality.
 */
export const JUDGE_SYSTEM_PROMPT = `You are an expert output quality evaluator. Your task is to assess the quality of an AI-generated output based on how well it serves the user's original goal.

Evaluate the following criteria:
1. **Clarity**: Is the output easy to understand? Is the language clear and unambiguous?
2. **Usefulness**: Does the output actually help accomplish the user's original goal? Would it be actionable?
3. **Accuracy**: Is the information correct, well-reasoned, and logically sound?
4. **Conciseness**: Is it appropriately detailed without unnecessary fluff or repetition?
5. **Insight**: Does it add value beyond the obvious? Does it show understanding of the problem?
6. **Real-world applicability**: Would this output work in practice? Is it realistic and implementable?

You MUST respond with a valid JSON object in this exact format:
{
  "score": <integer 1-10>,
  "critique": "<1-2 sentence analysis of strengths and weaknesses>"
}

Scoring guide:
- 9-10: Excellent - Highly useful, clear, accurate, and insightful
- 7-8: Good - Solid quality with minor areas for improvement
- 5-6: Acceptable - Gets the job done but lacks depth or polish
- 3-4: Poor - Significant quality issues that limit usefulness
- 1-2: Failed - Not useful for the intended purpose`;

/**
 * Extract the expanded prompt text from the AI response.
 */
const extractExpandedPrompt = (response) => {
  if (!response) return '';
  if (typeof response === 'string') return response.trim();

  // Try common paths
  const paths = [
    ['final_output', 'expanded_prompt_text'],
    ['final_output', 'expandedPromptText'],
    ['expanded_prompt_text'],
    ['expandedPromptText']
  ];

  for (const path of paths) {
    let value = response;
    for (const key of path) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Fallback: stringify final_output or entire response
  if (response.final_output) {
    if (typeof response.final_output === 'string') {
      return response.final_output.trim();
    }
    try {
      return JSON.stringify(response.final_output);
    } catch {
      return '';
    }
  }

  try {
    return JSON.stringify(response);
  } catch {
    return '';
  }
};

/**
 * Run a single experiment cell with optional Executor and Judge steps.
 *
 * @param {Object} combo - { tone: string, length: string, format: string }
 * @param {string} prompt - The original user prompt.
 * @param {string} outputType - The output type ID (e.g., 'doc').
 * @param {Function} callLLM - Async function to call the LLM: (userPrompt, systemPrompt) => Promise<response>
 * @param {Object} [toggles] - Optional toggles.
 * @param {Object} [models] - Model configuration { executionModel, judgeModel, enableJudge, apiKeys }
 * @returns {Promise<{ config: Object, blueprintResult: string, executionResult?: string, evaluation?: Object }>}
 */
export async function runExperimentCell(combo, prompt, outputType, callLLM, toggles = {}, models = {}) {
  const toneObj = TONES.find(t => t.id === combo.tone) || TONES[0];
  const lengthObj = LENGTHS.find(l => l.id === combo.length) || LENGTHS[1];
  const formatObj = FORMATS.find(f => f.id === combo.format) || FORMATS[0];
  const typeObj = OUTPUT_TYPES.find(t => t.id === outputType) || OUTPUT_TYPES[1];

  // Build the prompt plan
  const plan = buildPromptPlan({
    specId: outputType,
    userInput: prompt,
    tone: toneObj,
    outputType: typeObj,
    format: formatObj,
    length: lengthObj,
    notes: '',
    toggles: {
      allowPlaceholders: toggles.allowPlaceholders ?? false,
      stripMeta: toggles.stripMeta ?? true,
      aestheticMode: toggles.aestheticMode ?? false
    }
  });

  // Append the JSON contract to the system prompt
  const systemPrompt = `${plan.systemPrompt}

CRITICAL JSON RESPONSE CONTRACT:
You MUST return a complete JSON object with ALL THREE sections below.

REQUIRED STRUCTURE:
{
  "analysis": {
    "detected_domain": string,
    "input_quality_score": integer,
    "is_vague_or_short": boolean
  },
  "reverse_prompting": {
    "was_triggered": boolean,
    "refined_task_text": string,
    "reasoning": string
  },
  "final_output": {
    "expanded_prompt_text": string,
    "enrichment_attributes_used": string[]
  }
}

CRITICAL: The "expanded_prompt_text" field must contain the final expanded prompt. This field cannot be empty.`;

  const userPrompt = plan.userPrompt || prompt;

  // Call the LLM (Architect step)
  const response = await callLLM(userPrompt, systemPrompt);
  const blueprintResult = extractExpandedPrompt(response);

  const result = {
    config: combo,
    blueprintResult
  };

  // Phase 2: Executor step (if model specified and apiKeys available)
  if (models.executionModel && models.apiKeys && blueprintResult) {
    try {
      const executionResult = await callModel(
        models.executionModel,
        blueprintResult, // Use the blueprint as the prompt for execution
        '', // No system prompt for execution
        models.apiKeys
      );
      result.executionResult = executionResult;
      result.executionModelId = models.executionModel;

      // Phase 2: Judge step (if enabled)
      if (models.enableJudge && models.judgeModel) {
        try {
          const judgePrompt = `## Original User Request:
${prompt}

## Output Type: ${typeObj.label} (${typeObj.context})
## Tone: ${toneObj.label} | Length: ${lengthObj.label} | Format: ${formatObj.label}

## Blueprint (Expanded Prompt):
${blueprintResult}

## Generated Output:
${executionResult}

## Task:
Evaluate the quality of the Generated Output for this specific output type. Consider whether it effectively addresses the Original User Request and provides genuine value for a ${typeObj.label.toLowerCase()}. Return your evaluation as JSON.`;

          const judgeResponse = await callModel(
            models.judgeModel,
            judgePrompt,
            JUDGE_SYSTEM_PROMPT,
            models.apiKeys
          );

          const evaluation = parseJsonResponse(judgeResponse);
          result.evaluation = {
            ai: {
              score: evaluation.score || 0,
              critique: evaluation.critique || ''
            }
          };
          result.judgeModelId = models.judgeModel;
        } catch (judgeErr) {
          result.evaluation = {
            ai: {
              score: 0,
              critique: `Judge error: ${judgeErr.message}`
            }
          };
        }
      }
    } catch (execErr) {
      result.executionError = execErr.message;
    }
  }

  return result;
}

/**
 * Run a full matrix experiment.
 *
 * @param {Object} params
 * @param {string} params.prompt - The original user prompt.
 * @param {{ tones: string[], lengths: string[], formats: string[] }} params.matrixConfig
 * @param {string} params.outputType - The output type ID.
 * @param {Function} params.callLLM - Async function: (userPrompt, systemPrompt) => Promise<response>
 * @param {Object} [params.toggles] - Optional toggles.
 * @param {Object} [params.models] - Model configuration { executionModel, judgeModel, enableJudge, apiKeys }
 * @param {Function} [params.onProgress] - Optional callback: (completed, total, result) => void
 * @returns {Promise<Array<{ config: Object, blueprintResult: string, executionResult?: string, evaluation?: Object, error?: string }>>}
 */
export async function runMatrixExperiment({
  prompt,
  matrixConfig,
  outputType,
  callLLM,
  toggles = {},
  models = {},
  onProgress
}) {
  const combos = buildMatrixCombos(matrixConfig);
  if (combos.length === 0) {
    return [];
  }

  const results = [];
  let completed = 0;

  for (const combo of combos) {
    try {
      const result = await runExperimentCell(combo, prompt, outputType, callLLM, toggles, models);
      results.push(result);
    } catch (err) {
      results.push({
        config: combo,
        blueprintResult: '',
        error: err.message || 'Unknown error'
      });
    }

    completed++;
    if (onProgress) {
      await onProgress(completed, combos.length, results[results.length - 1]);
    }
  }

  return results;
}

export default runMatrixExperiment;
