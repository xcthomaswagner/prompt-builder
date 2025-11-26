import { buildMatrixCombos } from './cartesian';
import buildPromptPlan from './promptAssembler';

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
 * Run a single experiment cell (Architect step only for Phase 1).
 *
 * @param {Object} combo - { tone: string, length: string, format: string }
 * @param {string} prompt - The original user prompt.
 * @param {string} outputType - The output type ID (e.g., 'doc').
 * @param {Function} callLLM - Async function to call the LLM: (userPrompt, systemPrompt) => Promise<response>
 * @param {Object} [toggles] - Optional toggles.
 * @returns {Promise<{ config: Object, blueprintResult: string }>}
 */
export async function runExperimentCell(combo, prompt, outputType, callLLM, toggles = {}) {
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

  // Call the LLM
  const response = await callLLM(userPrompt, systemPrompt);
  const blueprintResult = extractExpandedPrompt(response);

  return {
    config: combo,
    blueprintResult
  };
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
 * @param {Function} [params.onProgress] - Optional callback: (completed, total, result) => void
 * @returns {Promise<Array<{ config: Object, blueprintResult: string, error?: string }>>}
 */
export async function runMatrixExperiment({
  prompt,
  matrixConfig,
  outputType,
  callLLM,
  toggles = {},
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
      const result = await runExperimentCell(combo, prompt, outputType, callLLM, toggles);
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
      onProgress(completed, combos.length, results[results.length - 1]);
    }
  }

  return results;
}

export default runMatrixExperiment;
