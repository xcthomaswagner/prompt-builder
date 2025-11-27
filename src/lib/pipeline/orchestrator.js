/**
 * Pipeline Orchestrator
 * 
 * Coordinates the analysis and generation pipeline.
 * 
 * @module pipeline/orchestrator
 */

import { analyzeIntent } from './analyzer.js';
import { generatePrompt } from './generator.js';
import { validateSpec, mergeSpec } from '../promptSpecs/index.js';

/**
 * Pipeline result
 * @typedef {Object} PipelineResult
 * @property {import('../promptSpecs/schema.js').BasePromptSpec} spec - The prompt spec
 * @property {string} expandedPrompt - The generated prompt
 * @property {string} structure - Structure summary
 * @property {string[]} keyElements - Key elements included
 * @property {Object} reasoning - Why settings were chosen
 * @property {Object|null} quality - Quality assessment (if enabled)
 * @property {Object} validation - Spec validation result
 */

/**
 * Pipeline options
 * @typedef {Object} PipelineOptions
 * @property {boolean} [skipAnalysis=false] - Skip analysis, use provided spec
 * @property {boolean} [skipQuality=false] - Skip quality assessment
 * @property {Object} [userOverrides={}] - User overrides to apply to spec
 * @property {number} [analysisTemperature=0.3] - Temperature for analysis
 * @property {number} [generationTemperature=0.7] - Temperature for generation
 */

/**
 * Apply user overrides to a spec
 * @param {import('../promptSpecs/schema.js').BasePromptSpec} spec
 * @param {Object} overrides
 * @returns {import('../promptSpecs/schema.js').BasePromptSpec}
 */
function applyOverrides(spec, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) {
    return spec;
  }
  
  const updates = {};
  
  // Handle tone override
  if (overrides.tone) {
    updates.inferred = { tone: overrides.tone };
  }
  
  // Handle format override
  if (overrides.format) {
    updates.inferred = { ...updates.inferred, format: overrides.format };
  }
  
  // Handle length override
  if (overrides.length) {
    updates.constraints = { length: overrides.length };
  }
  
  // Handle type-specific overrides
  if (overrides.typeSpecific) {
    updates.typeSpecific = overrides.typeSpecific;
  }
  
  // Handle direct spec updates
  if (overrides.intent) updates.intent = overrides.intent;
  if (overrides.audience) updates.audience = overrides.audience;
  if (overrides.context) updates.context = overrides.context;
  if (overrides.constraints) {
    updates.constraints = { ...updates.constraints, ...overrides.constraints };
  }
  if (overrides.quality) updates.quality = overrides.quality;
  
  return mergeSpec(spec, updates);
}

/**
 * Run the full prompt generation pipeline
 * @param {Object} input - User input
 * @param {string} input.userInput - The user's raw input
 * @param {string} [input.notes] - Additional notes
 * @param {Object} input.outputType - Selected output type
 * @param {import('../promptSpecs/schema.js').BasePromptSpec} [input.existingSpec] - Existing spec to use
 * @param {Function} callLLM - Function to call the LLM
 * @param {PipelineOptions} [options={}] - Pipeline options
 * @returns {Promise<PipelineResult>}
 */
export async function runPipeline(input, callLLM, options = {}) {
  const {
    skipAnalysis = false,
    skipQuality = false,
    userOverrides = {},
    analysisTemperature = 0.3,
    generationTemperature = 0.7,
  } = options;
  
  let spec;
  
  // Step 1: Analysis (or use existing spec)
  if (skipAnalysis && input.existingSpec) {
    spec = input.existingSpec;
  } else {
    spec = await analyzeIntent(input, callLLM, { 
      temperature: analysisTemperature 
    });
  }
  
  // Step 2: Apply user overrides
  spec = applyOverrides(spec, userOverrides);
  
  // Step 3: Validate
  const validation = validateSpec(spec);
  if (!validation.valid) {
    console.warn('Spec validation warnings:', validation.errors);
    // Continue anyway - validation errors are often recoverable
  }
  
  // Step 4: Generation
  const generation = await generatePrompt(spec, callLLM, {
    temperature: generationTemperature,
  });
  
  // Step 5: Quality Assessment (future - placeholder for now)
  let quality = null;
  if (!skipQuality) {
    // TODO: Implement quality assessment in Phase 4
    quality = null;
  }
  
  return {
    spec,
    expandedPrompt: generation.expanded_prompt,
    structure: generation.structure_summary,
    keyElements: generation.key_elements,
    reasoning: spec.inferred?.reasoning || {},
    quality,
    validation,
  };
}

/**
 * Run analysis only (without generation)
 * @param {Object} input - User input
 * @param {Function} callLLM - Function to call the LLM
 * @param {Object} [options={}] - Options
 * @returns {Promise<import('../promptSpecs/schema.js').BasePromptSpec>}
 */
export async function runAnalysisOnly(input, callLLM, options = {}) {
  return analyzeIntent(input, callLLM, options);
}

/**
 * Run generation only (from existing spec)
 * @param {import('../promptSpecs/schema.js').BasePromptSpec} spec - The spec
 * @param {Function} callLLM - Function to call the LLM
 * @param {Object} [options={}] - Options
 * @returns {Promise<import('./generator.js').GenerationResult>}
 */
export async function runGenerationOnly(spec, callLLM, options = {}) {
  return generatePrompt(spec, callLLM, options);
}

/**
 * Export for testing
 */
export const _internal = {
  applyOverrides,
};
