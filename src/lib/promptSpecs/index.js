/**
 * Prompt Specs Module
 * 
 * Public API for the Prompt Spec system.
 * 
 * @module promptSpecs
 */

// Schema exports
export {
  SCHEMA_VERSION,
  createBaseSpec,
  createIntent,
  createAudience,
  createContext,
  createConstraints,
  createQuality,
  createInferred,
  cloneSpec,
  mergeSpec,
} from './schema.js';

// Validator exports
export {
  validateSpec,
  isMinimallyValid,
  formatValidationResult,
} from './validator.js';

// Template exports - Deck
export {
  createDeckSpec,
  deckDefaults,
  inferSlideCount,
  recommendVisualStyle,
  validateDeckSpec,
} from './templates/deck.js';

// Template exports - Code
export {
  createCodeSpec,
  codeDefaults,
  LANGUAGES,
  FRAMEWORKS,
  inferLanguageFromFramework,
  recommendErrorHandling,
  validateCodeSpec,
} from './templates/code.js';

// Template exports - Doc
export {
  createDocSpec,
  docDefaults,
  SECTION_STRUCTURES,
  recommendSections,
  shouldIncludeExecutiveSummary,
  validateDocSpec,
} from './templates/doc.js';

// Template exports - Data
export {
  createDataSpec,
  dataDefaults,
  recommendOutputFormat,
  validateDataSpec,
} from './templates/data.js';

// Template exports - Copy
export {
  createCopySpec,
  copyDefaults,
  CTA_SUGGESTIONS,
  WORD_COUNT_RANGES,
  getCTASuggestions,
  getWordCountRange,
  validateCopySpec,
} from './templates/copy.js';

// Template exports - Comms
export {
  createCommsSpec,
  commsDefaults,
  CHANNEL_TRAITS,
  recommendFormality,
  getChannelTraits,
  validateCommsSpec,
} from './templates/comms.js';

/**
 * Create a spec for any output type
 * @param {string} outputType - deck|doc|data|code|copy|comms
 * @returns {import('./schema.js').BasePromptSpec}
 */
export function createSpec(outputType) {
  switch (outputType) {
    case 'deck':
      return createDeckSpec();
    case 'code':
      return createCodeSpec();
    case 'doc':
      return createDocSpec();
    case 'data':
      return createDataSpec();
    case 'copy':
      return createCopySpec();
    case 'comms':
      return createCommsSpec();
    default:
      throw new Error(`Unknown output type: ${outputType}`);
  }
}
