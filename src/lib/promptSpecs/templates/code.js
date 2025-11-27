/**
 * Code-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to code generation.
 * 
 * @module promptSpecs/templates/code
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'minimal'|'standard'|'comprehensive'} ErrorHandlingLevel
 */

/**
 * @typedef {Object} CodeTypeSpecific
 * @property {string} language - Programming language
 * @property {string|null} framework - Framework if applicable
 * @property {boolean} include_tests - Generate test cases
 * @property {boolean} include_comments - Include inline documentation
 * @property {ErrorHandlingLevel} error_handling - Error handling level
 * @property {string|null} style_guide - Coding style reference
 * @property {string[]} dependencies - Required packages
 */

/**
 * Default code-specific fields
 * @type {CodeTypeSpecific}
 */
export const codeDefaults = {
  language: '',
  framework: null,
  include_tests: false,
  include_comments: true,
  error_handling: 'standard',
  style_guide: null,
  dependencies: [],
};

/**
 * Common programming languages
 */
export const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'csharp',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'cpp',
  'c',
  'scala',
  'elixir',
];

/**
 * Common frameworks by language
 */
export const FRAMEWORKS = {
  javascript: ['react', 'vue', 'angular', 'express', 'nextjs', 'node'],
  typescript: ['react', 'vue', 'angular', 'express', 'nextjs', 'nestjs'],
  python: ['django', 'flask', 'fastapi', 'pytorch', 'tensorflow'],
  java: ['spring', 'springboot', 'quarkus', 'micronaut'],
  go: ['gin', 'echo', 'fiber', 'chi'],
  rust: ['actix', 'rocket', 'axum', 'tokio'],
  csharp: ['aspnet', 'blazor', 'maui', 'unity'],
  ruby: ['rails', 'sinatra', 'hanami'],
  php: ['laravel', 'symfony', 'codeigniter'],
  swift: ['swiftui', 'uikit', 'vapor'],
  kotlin: ['ktor', 'springboot', 'android'],
};

/**
 * Create a Code Prompt Spec with code-specific defaults
 * @returns {import('../schema.js').BasePromptSpec}
 */
export function createCodeSpec() {
  const spec = createBaseSpec('code');
  spec.typeSpecific = { ...codeDefaults };
  return spec;
}

/**
 * Infer language from framework
 * @param {string} framework
 * @returns {string|null}
 */
export function inferLanguageFromFramework(framework) {
  const lowerFramework = framework.toLowerCase();
  
  for (const [language, frameworks] of Object.entries(FRAMEWORKS)) {
    if (frameworks.includes(lowerFramework)) {
      return language;
    }
  }
  
  return null;
}

/**
 * Get recommended error handling based on context
 * @param {boolean} isProduction - Is this for production use
 * @param {boolean} hasTests - Are tests included
 * @returns {ErrorHandlingLevel}
 */
export function recommendErrorHandling(isProduction, hasTests) {
  if (isProduction) {
    return 'comprehensive';
  }
  if (hasTests) {
    return 'standard';
  }
  return 'minimal';
}

/**
 * Validate code-specific fields
 * @param {CodeTypeSpecific} typeSpecific
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateCodeSpec(typeSpecific) {
  const errors = [];
  const warnings = [];
  
  if (!typeSpecific.language) {
    warnings.push('No language specified - will attempt to infer from context');
  }
  
  if (typeSpecific.language && !LANGUAGES.includes(typeSpecific.language.toLowerCase())) {
    warnings.push(`Language "${typeSpecific.language}" is not in common list - ensure it's valid`);
  }
  
  if (typeSpecific.framework && typeSpecific.language) {
    const langFrameworks = FRAMEWORKS[typeSpecific.language.toLowerCase()];
    if (langFrameworks && !langFrameworks.includes(typeSpecific.framework.toLowerCase())) {
      warnings.push(`Framework "${typeSpecific.framework}" may not be common for ${typeSpecific.language}`);
    }
  }
  
  if (typeSpecific.error_handling === 'minimal' && typeSpecific.include_tests) {
    warnings.push('Minimal error handling with tests may lead to poor test coverage');
  }
  
  return { errors, warnings };
}
