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
 * Judge v2 system prompt with multi-dimensional rubrics and calibrated scoring.
 */
export const JUDGE_SYSTEM_PROMPT = `You are an expert output quality evaluator using a multi-dimensional rubric system.

## SCORING CALIBRATION (CRITICAL)
Use the FULL 0-10 range. Do not compress scores.
- **7 = Baseline**: A competent but imperfect answer. This is your anchor point.
- **8-10**: Reserve for distinctly superior responses with clear excellence.
- **5-6**: Meaningful issues present, but still useful.
- **0-4**: Poor, seriously flawed, or fails the task.

## FOUR EVALUATION DIMENSIONS
Score each dimension independently (0-10):

1. **Instruction Adherence**: Does the output follow all explicit instructions from the blueprint/prompt?
2. **Task Quality & Correctness**: Is the content accurate, well-reasoned, and genuinely useful for the task?
3. **Structure & Format**: Does the output follow the requested format and have clear, logical organization?
4. **Tone & Audience Fit**: Does the tone match the request? Is it appropriate for the intended audience?

## JUSTIFICATION REQUIREMENTS
For EACH dimension, you must explain:
- Why you assigned this specific score
- Why it is NOT higher (what would improve it)
- Why it is NOT lower (what it does well)

## RESPONSE FORMAT
You MUST respond with a valid JSON object in this exact format:
{
  "dimensions": {
    "instructionAdherence": <0-10>,
    "taskQuality": <0-10>,
    "structureFormat": <0-10>,
    "toneAudience": <0-10>
  },
  "justifications": {
    "instructionAdherence": "<why this score, why not higher, why not lower>",
    "taskQuality": "<why this score, why not higher, why not lower>",
    "structureFormat": "<why this score, why not higher, why not lower>",
    "toneAudience": "<why this score, why not higher, why not lower>"
  },
  "composite": <weighted average, 1 decimal place>,
  "summary": "<1-2 sentence overall assessment>"
}`;

/**
 * Judge A (Strict) - Focuses on accuracy and technical correctness
 */
const JUDGE_A_STRICT_PROMPT = `You are JUDGE A (STRICT) - an expert evaluator focused on ACCURACY and TECHNICAL CORRECTNESS.

Your evaluation priorities (in order):
1. **Factual accuracy** - Is the content correct and verifiable?
2. **Completeness** - Does it fully address all requirements?
3. **Technical precision** - Are details exact and unambiguous?
4. **Logical coherence** - Is the reasoning sound?

You are deliberately STRICT. When in doubt, score LOWER. A score of 7 means "technically correct with minor issues."

${JUDGE_SYSTEM_PROMPT}`;

/**
 * Judge B (Style) - Focuses on readability and user experience
 */
const JUDGE_B_STYLE_PROMPT = `You are JUDGE B (STYLE) - an expert evaluator focused on READABILITY and USER EXPERIENCE.

Your evaluation priorities (in order):
1. **Clarity** - Is it easy to understand on first read?
2. **Engagement** - Is it interesting and well-written?
3. **Appropriate tone** - Does it match the audience and context?
4. **Flow and structure** - Does it guide the reader smoothly?

You are deliberately focused on STYLE. A score of 7 means "readable and appropriate but not exceptional."

${JUDGE_SYSTEM_PROMPT}`;

/**
 * Get rubric enforcement modifier for the judge prompt.
 */
const getRubricEnforcementModifier = (mode) => {
  switch (mode) {
    case 'lenient':
      return `\n## ENFORCEMENT MODE: LENIENT
Focus on overall intent and value. Minor issues should not significantly impact scores.
Be generous when the output achieves its core purpose, even if execution is imperfect.`;
    case 'strict':
      return `\n## ENFORCEMENT MODE: STRICT
Apply all criteria rigorously. Every deviation from requirements should impact the score.
Reserve high scores (8+) only for outputs that excel across ALL dimensions.`;
    default:
      return ''; // Standard mode - no modifier
  }
};

/**
 * Build baseline examples section for anchored judging.
 * Handles text-based and file-based (PDF/image) baselines.
 * 
 * @param {Object} baselines - Baselines object { [outputType]: [{ score, label, content, contentType, fileUrl }] }
 * @param {string} outputType - Current output type ID
 * @returns {{ textSection: string, fileAttachments: Array, requiresVision: boolean }}
 */
const buildBaselineSection = (baselines, outputType) => {
  const result = {
    textSection: '',
    fileAttachments: [],
    requiresVision: false
  };

  if (!baselines || !baselines[outputType] || baselines[outputType].length === 0) {
    return result;
  }

  const examples = baselines[outputType];
  const sortedExamples = [...examples].sort((a, b) => a.score - b.score);
  
  // Separate text-based and file-based examples
  const textExamples = sortedExamples.filter(ex => ex.content && !ex.fileUrl);
  const fileExamples = sortedExamples.filter(ex => ex.fileUrl);

  // Build text section
  if (textExamples.length > 0 || fileExamples.length > 0) {
    let section = `\n## CALIBRATION EXAMPLES (Score Anchors)
Use these examples to calibrate your scoring. Compare the candidate output against these reference points.

`;

    // Add text-based examples
    for (const ex of textExamples) {
      const contentPreview = ex.content.substring(0, 500);
      section += `### Score ${ex.score}/10 Example${ex.label ? ` - ${ex.label}` : ''} [${ex.contentType || 'text'}]
\`\`\`
${contentPreview}${ex.content.length > 500 ? '...' : ''}
\`\`\`

`;
    }

    // Add references to file-based examples
    for (const ex of fileExamples) {
      section += `### Score ${ex.score}/10 Example${ex.label ? ` - ${ex.label}` : ''} [${ex.contentType || 'file'}]
*See attached file: ${ex.fileName}*

`;
      result.fileAttachments.push({
        url: ex.fileUrl,
        fileName: ex.fileName,
        contentType: ex.contentType,
        score: ex.score
      });
      if (ex.contentType === 'pdf' || ex.contentType === 'image') {
        result.requiresVision = true;
      }
    }

    section += `**Scoring Instruction**: Score the candidate relative to these examples. If clearly better than a reference → score higher. If clearly worse → score lower. If similar quality → assign the same score.\n`;

    result.textSection = section;
  }

  return result;
};

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
 * @param {Object} [typeSpecific] - Type-specific form data (e.g., copy_type, emotional_appeal)
 * @returns {Promise<{ config: Object, blueprintResult: string, executionResult?: string, evaluation?: Object }>}
 */
export async function runExperimentCell(combo, prompt, outputType, callLLM, toggles = {}, models = {}, typeSpecific = {}) {
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
    },
    typeSpecific // Pass type-specific form data
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
          // Build baseline section for anchored judging (Layer 3)
          const baselineInfo = buildBaselineSection(models.baselines, outputType);
          const judgeOptions = models.judgeOptions || {};
          const rubricModifier = getRubricEnforcementModifier(judgeOptions.rubricEnforcement);
          
          // Build the judge prompt
          const judgePrompt = `## Original User Request:
${prompt}

## Output Type: ${typeObj.label} (${typeObj.context})
## Tone: ${toneObj.label} | Length: ${lengthObj.label} | Format: ${formatObj.label}
${baselineInfo.textSection}
## Blueprint (Expanded Prompt):
${blueprintResult}

## Generated Output:
${executionResult}

## Task:
Evaluate the quality of the Generated Output for this specific output type. Consider whether it effectively addresses the Original User Request and provides genuine value for a ${typeObj.label.toLowerCase()}. Return your evaluation as JSON.`;

          let finalEvaluation;

          if (judgeOptions.dualJudge) {
            // Dual-judge committee mode: Run two judges and average
            const [judgeAResponse, judgeBResponse] = await Promise.all([
              callModel(
                models.judgeModel,
                judgePrompt,
                JUDGE_A_STRICT_PROMPT + rubricModifier,
                models.apiKeys,
                baselineInfo.fileAttachments
              ),
              callModel(
                models.judgeModel,
                judgePrompt,
                JUDGE_B_STYLE_PROMPT + rubricModifier,
                models.apiKeys,
                baselineInfo.fileAttachments
              )
            ]);

            const evalA = parseJsonResponse(judgeAResponse);
            const evalB = parseJsonResponse(judgeBResponse);

            // Average the dimension scores
            const avgDimensions = {
              instructionAdherence: ((evalA.dimensions?.instructionAdherence || 0) + (evalB.dimensions?.instructionAdherence || 0)) / 2,
              taskQuality: ((evalA.dimensions?.taskQuality || 0) + (evalB.dimensions?.taskQuality || 0)) / 2,
              structureFormat: ((evalA.dimensions?.structureFormat || 0) + (evalB.dimensions?.structureFormat || 0)) / 2,
              toneAudience: ((evalA.dimensions?.toneAudience || 0) + (evalB.dimensions?.toneAudience || 0)) / 2
            };

            const avgComposite = parseFloat(
              ((avgDimensions.instructionAdherence + avgDimensions.taskQuality + 
                avgDimensions.structureFormat + avgDimensions.toneAudience) / 4).toFixed(1)
            );

            finalEvaluation = {
              dimensions: avgDimensions,
              justifications: {
                instructionAdherence: `[Strict: ${evalA.dimensions?.instructionAdherence || 0}] ${evalA.justifications?.instructionAdherence || ''}\n[Style: ${evalB.dimensions?.instructionAdherence || 0}] ${evalB.justifications?.instructionAdherence || ''}`,
                taskQuality: `[Strict: ${evalA.dimensions?.taskQuality || 0}] ${evalA.justifications?.taskQuality || ''}\n[Style: ${evalB.dimensions?.taskQuality || 0}] ${evalB.justifications?.taskQuality || ''}`,
                structureFormat: `[Strict: ${evalA.dimensions?.structureFormat || 0}] ${evalA.justifications?.structureFormat || ''}\n[Style: ${evalB.dimensions?.structureFormat || 0}] ${evalB.justifications?.structureFormat || ''}`,
                toneAudience: `[Strict: ${evalA.dimensions?.toneAudience || 0}] ${evalA.justifications?.toneAudience || ''}\n[Style: ${evalB.dimensions?.toneAudience || 0}] ${evalB.justifications?.toneAudience || ''}`
              },
              composite: avgComposite,
              summary: `[Dual-Judge Average] Strict: ${evalA.composite || 0}, Style: ${evalB.composite || 0}. ${evalA.summary || ''}`
            };
          } else {
            // Single judge mode
            const judgeResponse = await callModel(
              models.judgeModel,
              judgePrompt,
              JUDGE_SYSTEM_PROMPT + rubricModifier,
              models.apiKeys,
              baselineInfo.fileAttachments
            );

            finalEvaluation = parseJsonResponse(judgeResponse);
          }
          
          // Calculate composite if not provided
          let composite = finalEvaluation.composite;
          if (!composite && finalEvaluation.dimensions) {
            const dims = finalEvaluation.dimensions;
            const scores = [
              dims.instructionAdherence || 0,
              dims.taskQuality || 0,
              dims.structureFormat || 0,
              dims.toneAudience || 0
            ];
            composite = parseFloat((scores.reduce((a, b) => a + b, 0) / 4).toFixed(1));
          }
          
          result.evaluation = {
            ai: {
              // New v2 schema
              dimensions: finalEvaluation.dimensions || null,
              justifications: finalEvaluation.justifications || null,
              composite: composite || 0,
              summary: finalEvaluation.summary || '',
              // Legacy compatibility
              score: composite || finalEvaluation.score || 0,
              critique: finalEvaluation.summary || finalEvaluation.critique || '',
              // Metadata
              dualJudge: judgeOptions.dualJudge || false,
              rubricEnforcement: judgeOptions.rubricEnforcement || 'standard'
            }
          };
          result.judgeModelId = models.judgeModel;
        } catch (judgeErr) {
          result.evaluation = {
            ai: {
              dimensions: null,
              justifications: null,
              composite: 0,
              summary: `Judge error: ${judgeErr.message}`,
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
  onProgress,
  signal, // AbortSignal for cancellation
  typeSpecific = {} // Type-specific form data (e.g., copy_type, emotional_appeal)
}) {
  const combos = buildMatrixCombos(matrixConfig);
  if (combos.length === 0) {
    return [];
  }

  const results = [];
  let completed = 0;

  for (const combo of combos) {
    // Check for cancellation before each cell
    if (signal?.aborted) {
      break;
    }

    try {
      const result = await runExperimentCell(combo, prompt, outputType, callLLM, toggles, models, typeSpecific);
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
