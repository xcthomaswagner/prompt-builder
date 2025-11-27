/**
 * Data-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to structured data generation.
 * 
 * @module promptSpecs/templates/data
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'table'|'json'|'csv'|'yaml'|'xml'} OutputFormat
 */

/**
 * @typedef {Object} DataTypeSpecific
 * @property {OutputFormat} output_format - Data format
 * @property {Object|null} schema_definition - Expected structure
 * @property {boolean} include_headers - Include column headers
 * @property {boolean} include_descriptions - Include field descriptions
 * @property {string[]} relationships - Data relationships
 * @property {string[]} aggregations - Calculations needed
 */

/**
 * Default data-specific fields
 * @type {DataTypeSpecific}
 */
export const dataDefaults = {
  output_format: 'table',
  schema_definition: null,
  include_headers: true,
  include_descriptions: false,
  relationships: [],
  aggregations: [],
};

/**
 * Create a Data Prompt Spec with data-specific defaults
 * @returns {import('../schema.js').BasePromptSpec}
 */
export function createDataSpec() {
  const spec = createBaseSpec('data');
  spec.typeSpecific = { ...dataDefaults };
  return spec;
}

/**
 * Recommend output format based on use case
 * @param {string} useCase - 'analysis'|'export'|'api'|'display'
 * @returns {OutputFormat}
 */
export function recommendOutputFormat(useCase) {
  switch (useCase) {
    case 'analysis':
      return 'table';
    case 'export':
      return 'csv';
    case 'api':
      return 'json';
    case 'display':
      return 'table';
    case 'config':
      return 'yaml';
    default:
      return 'table';
  }
}

/**
 * Validate data-specific fields
 * @param {DataTypeSpecific} typeSpecific
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateDataSpec(typeSpecific) {
  const errors = [];
  const warnings = [];
  
  if (typeSpecific.output_format === 'csv' && typeSpecific.relationships.length > 0) {
    warnings.push('CSV format may not represent relationships well - consider JSON');
  }
  
  if (typeSpecific.output_format === 'table' && typeSpecific.aggregations.length > 5) {
    warnings.push('Many aggregations may be hard to display in a single table');
  }
  
  if (!typeSpecific.include_headers && typeSpecific.output_format === 'csv') {
    warnings.push('CSV without headers may be difficult to interpret');
  }
  
  return { errors, warnings };
}
