/**
 * Deck-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to slide deck generation.
 * 
 * @module promptSpecs/templates/deck
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'minimal'|'data-heavy'|'image-rich'} VisualStyle
 */

/**
 * @typedef {'investor'|'sales'|'board'|'internal'|'training'} DeckType
 */

/**
 * @typedef {Object} DeckTypeSpecific
 * @property {DeckType} deck_type - Type of deck
 * @property {number|null} slide_count - Target number of slides
 * @property {VisualStyle} visual_style - Visual approach
 * @property {boolean} include_speaker_notes - Include speaker notes
 */

/**
 * Default deck-specific fields
 * @type {DeckTypeSpecific}
 */
export const deckDefaults = {
  deck_type: 'internal',
  slide_count: null,
  visual_style: 'minimal',
  include_speaker_notes: true,
};

/**
 * Create a Deck Prompt Spec with deck-specific defaults
 * @returns {import('../schema.js').BasePromptSpec}
 */
export function createDeckSpec() {
  const spec = createBaseSpec('deck');
  spec.typeSpecific = { ...deckDefaults };
  return spec;
}

/**
 * Get recommended visual style based on deck type
 * @param {DeckType} deckType
 * @returns {VisualStyle}
 */
export function recommendVisualStyle(deckType) {
  switch (deckType) {
    case 'investor':
    case 'sales':
      return 'image-rich';
    case 'board':
      return 'data-heavy';
    case 'training':
      return 'data-heavy';
    case 'internal':
    default:
      return 'minimal';
  }
}

/**
 * Validate deck-specific fields
 * @param {DeckTypeSpecific} typeSpecific
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateDeckSpec(typeSpecific) {
  const errors = [];
  const warnings = [];
  
  if (typeSpecific.slide_count !== null) {
    if (typeSpecific.slide_count < 1) {
      errors.push('Slide count must be at least 1');
    }
    if (typeSpecific.slide_count > 100) {
      warnings.push('Slide count over 100 may be too long for most presentations');
    }
    if (typeSpecific.slide_count > 50) {
      warnings.push('Consider breaking into multiple presentations');
    }
  }
  
  return { errors, warnings };
}
