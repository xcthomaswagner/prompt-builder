/**
 * Prompt Spec Validator
 * 
 * Validates Prompt Specs against the schema and type-specific requirements.
 * 
 * @module promptSpecs/validator
 */

import { SCHEMA_VERSION } from './schema.js';
import { validateDeckSpec } from './templates/deck.js';
import { validateCodeSpec } from './templates/code.js';
import { validateDocSpec } from './templates/doc.js';
import { validateDataSpec } from './templates/data.js';
import { validateCopySpec } from './templates/copy.js';
import { validateCommsSpec } from './templates/comms.js';

/**
 * Type-specific validators
 */
const typeValidators = {
  deck: validateDeckSpec,
  code: validateCodeSpec,
  doc: validateDocSpec,
  data: validateDataSpec,
  copy: validateCopySpec,
  comms: validateCommsSpec,
};

/**
 * Valid output types
 */
const VALID_OUTPUT_TYPES = ['deck', 'doc', 'data', 'code', 'copy', 'comms'];

/**
 * Valid urgency levels
 */
const VALID_URGENCY = ['low', 'normal', 'high', 'critical'];

/**
 * Valid expertise levels
 */
const VALID_EXPERTISE = ['novice', 'general', 'expert', 'mixed'];

/**
 * Valid length options
 */
const VALID_LENGTHS = ['short', 'medium', 'long'];

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the spec is valid
 * @property {string[]} errors - Critical errors that must be fixed
 * @property {string[]} warnings - Non-critical issues
 */

/**
 * Validate a Prompt Spec
 * @param {import('./schema.js').BasePromptSpec} spec
 * @returns {ValidationResult}
 */
export function validateSpec(spec) {
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!spec) {
    return { valid: false, errors: ['Spec is null or undefined'], warnings: [] };
  }
  
  if (!spec.version) {
    errors.push('Missing version');
  } else if (spec.version !== SCHEMA_VERSION) {
    warnings.push(`Spec version ${spec.version} differs from current ${SCHEMA_VERSION}`);
  }
  
  if (!spec.outputType) {
    errors.push('Missing outputType');
  } else if (!VALID_OUTPUT_TYPES.includes(spec.outputType)) {
    errors.push(`Invalid outputType: ${spec.outputType}. Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`);
  }
  
  // Intent validation
  if (!spec.intent) {
    errors.push('Missing intent object');
  } else {
    if (!spec.intent.primary_goal || spec.intent.primary_goal.trim() === '') {
      errors.push('Missing intent.primary_goal');
    }
    if (spec.intent.urgency && !VALID_URGENCY.includes(spec.intent.urgency)) {
      warnings.push(`Invalid urgency: ${spec.intent.urgency}`);
    }
  }
  
  // Audience validation
  if (spec.audience) {
    if (spec.audience.expertise_level && !VALID_EXPERTISE.includes(spec.audience.expertise_level)) {
      warnings.push(`Invalid expertise_level: ${spec.audience.expertise_level}`);
    }
  }
  
  // Constraints validation
  if (spec.constraints) {
    if (spec.constraints.length && !VALID_LENGTHS.includes(spec.constraints.length)) {
      warnings.push(`Invalid length: ${spec.constraints.length}`);
    }
  }
  
  // Type-specific validation
  if (spec.outputType && spec.typeSpecific) {
    const typeValidator = typeValidators[spec.outputType];
    if (typeValidator) {
      const typeResult = typeValidator(spec.typeSpecific);
      errors.push(...typeResult.errors);
      warnings.push(...typeResult.warnings);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick check if a spec has minimum required fields
 * @param {import('./schema.js').BasePromptSpec} spec
 * @returns {boolean}
 */
export function isMinimallyValid(spec) {
  return !!(
    spec &&
    spec.version &&
    spec.outputType &&
    spec.intent?.primary_goal
  );
}

/**
 * Get validation summary as a string
 * @param {ValidationResult} result
 * @returns {string}
 */
export function formatValidationResult(result) {
  if (result.valid && result.warnings.length === 0) {
    return 'Spec is valid';
  }
  
  const parts = [];
  
  if (!result.valid) {
    parts.push(`Errors (${result.errors.length}):`);
    result.errors.forEach(e => parts.push(`  - ${e}`));
  }
  
  if (result.warnings.length > 0) {
    parts.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach(w => parts.push(`  - ${w}`));
  }
  
  return parts.join('\n');
}
