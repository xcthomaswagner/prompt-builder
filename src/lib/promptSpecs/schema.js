/**
 * Prompt Spec Schema
 * 
 * Structured intermediate representation between user input and prompt generation.
 * This decouples analysis from generation and enables inspection, editing, and learning.
 * 
 * @module promptSpecs/schema
 */

export const SCHEMA_VERSION = '1.0.0';

/**
 * @typedef {'deck'|'doc'|'data'|'code'|'copy'|'comms'} OutputType
 */

/**
 * @typedef {'low'|'normal'|'high'|'critical'} Urgency
 */

/**
 * @typedef {'novice'|'general'|'expert'|'mixed'} ExpertiseLevel
 */

/**
 * @typedef {'subordinate'|'peer'|'superior'|'customer'|'public'} Relationship
 */

/**
 * @typedef {'short'|'medium'|'long'} Length
 */

/**
 * Intent - What the user wants to achieve
 * @typedef {Object} Intent
 * @property {string} primary_goal - Core objective
 * @property {string[]} success_criteria - How to measure success
 * @property {string} action_desired - What reader should do after
 * @property {Urgency} urgency - Priority level
 */

/**
 * Audience - Who consumes the output
 * @typedef {Object} Audience
 * @property {string} primary - Main audience description
 * @property {string|null} secondary - Secondary audience if any
 * @property {ExpertiseLevel} expertise_level - Knowledge level
 * @property {Relationship} relationship - Relationship to creator
 * @property {string[]} expectations - What they expect to see
 */

/**
 * Context - Situational information
 * @typedef {Object} Context
 * @property {string} setting - Where/when this will be used
 * @property {string[]} prior_knowledge - What audience already knows
 * @property {string[]} related_materials - Reference materials
 * @property {string} cultural_notes - Cultural considerations
 */

/**
 * Constraints - Limitations and requirements
 * @typedef {Object} Constraints
 * @property {Length} length - Desired length
 * @property {string|null} length_specific - Specific length (e.g., "500 words")
 * @property {string|null} time_to_consume - Reading/viewing time
 * @property {string[]} tone_markers - Tone descriptors
 * @property {string[]} format_requirements - Structural requirements
 * @property {string[]} forbidden - Things to avoid
 * @property {string|null} brand_voice - Brand guidelines reference
 */

/**
 * Quality - What good looks like
 * @typedef {Object} Quality
 * @property {string[]} must_include - Required content/topics
 * @property {string[]} nice_to_have - Optional enhancements
 * @property {string} differentiation - What makes this stand out
 * @property {string[]} anti_patterns - What to avoid
 */

/**
 * Inferred settings from analysis
 * @typedef {Object} Inferred
 * @property {string|null} tone - Inferred tone
 * @property {string|null} format - Inferred format
 * @property {string|null} length - Inferred length
 * @property {Object<string, string>} reasoning - Why each choice was made
 */

/**
 * Base Prompt Spec - common fields for all output types
 * @typedef {Object} BasePromptSpec
 * @property {string} version - Schema version
 * @property {OutputType} outputType - Type of output
 * @property {Date|null} generatedAt - When spec was created
 * @property {Intent} intent - User's intent
 * @property {Audience} audience - Target audience
 * @property {Context} context - Situational context
 * @property {Constraints} constraints - Limitations
 * @property {Quality} quality - Quality criteria
 * @property {Object} typeSpecific - Type-specific fields
 * @property {Inferred} inferred - Inferred settings
 */

/**
 * Create a new Intent object with defaults
 * @returns {Intent}
 */
export function createIntent() {
  return {
    primary_goal: '',
    success_criteria: [],
    action_desired: '',
    urgency: 'normal',
  };
}

/**
 * Create a new Audience object with defaults
 * @returns {Audience}
 */
export function createAudience() {
  return {
    primary: '',
    secondary: null,
    expertise_level: 'general',
    relationship: 'neutral',
    expectations: [],
  };
}

/**
 * Create a new Context object with defaults
 * @returns {Context}
 */
export function createContext() {
  return {
    setting: '',
    prior_knowledge: [],
    related_materials: [],
    cultural_notes: '',
  };
}

/**
 * Create a new Constraints object with defaults
 * @returns {Constraints}
 */
export function createConstraints() {
  return {
    length: 'medium',
    length_specific: null,
    time_to_consume: null,
    tone_markers: [],
    format_requirements: [],
    forbidden: [],
    brand_voice: null,
  };
}

/**
 * Create a new Quality object with defaults
 * @returns {Quality}
 */
export function createQuality() {
  return {
    must_include: [],
    nice_to_have: [],
    differentiation: '',
    anti_patterns: [],
  };
}

/**
 * Create a new Inferred object with defaults
 * @returns {Inferred}
 */
export function createInferred() {
  return {
    tone: null,
    format: null,
    length: null,
    reasoning: {},
  };
}

/**
 * Create a base Prompt Spec with all defaults
 * @param {OutputType} outputType - The output type
 * @returns {BasePromptSpec}
 */
export function createBaseSpec(outputType) {
  return {
    version: SCHEMA_VERSION,
    outputType,
    generatedAt: null,
    intent: createIntent(),
    audience: createAudience(),
    context: createContext(),
    constraints: createConstraints(),
    quality: createQuality(),
    typeSpecific: {},
    inferred: createInferred(),
  };
}

/**
 * Deep clone a spec to avoid mutations
 * @param {BasePromptSpec} spec
 * @returns {BasePromptSpec}
 */
export function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

/**
 * Merge partial spec updates into an existing spec
 * @param {BasePromptSpec} spec - Original spec
 * @param {Partial<BasePromptSpec>} updates - Updates to apply
 * @returns {BasePromptSpec}
 */
export function mergeSpec(spec, updates) {
  const cloned = cloneSpec(spec);
  
  // Deep merge each section
  if (updates.intent) {
    cloned.intent = { ...cloned.intent, ...updates.intent };
  }
  if (updates.audience) {
    cloned.audience = { ...cloned.audience, ...updates.audience };
  }
  if (updates.context) {
    cloned.context = { ...cloned.context, ...updates.context };
  }
  if (updates.constraints) {
    cloned.constraints = { ...cloned.constraints, ...updates.constraints };
  }
  if (updates.quality) {
    cloned.quality = { ...cloned.quality, ...updates.quality };
  }
  if (updates.typeSpecific) {
    cloned.typeSpecific = { ...cloned.typeSpecific, ...updates.typeSpecific };
  }
  if (updates.inferred) {
    cloned.inferred = { ...cloned.inferred, ...updates.inferred };
    if (updates.inferred.reasoning) {
      cloned.inferred.reasoning = { ...cloned.inferred.reasoning, ...updates.inferred.reasoning };
    }
  }
  
  // Simple overwrites
  if (updates.version) cloned.version = updates.version;
  if (updates.outputType) cloned.outputType = updates.outputType;
  if (updates.generatedAt) cloned.generatedAt = updates.generatedAt;
  
  return cloned;
}
