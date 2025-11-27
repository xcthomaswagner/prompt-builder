/**
 * Deck-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to slide deck generation.
 * 
 * @module promptSpecs/templates/deck
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'keynote'|'internal'|'pitch'|'training'} PresentationContext
 */

/**
 * @typedef {'minimal'|'data-heavy'|'image-rich'} VisualStyle
 */

/**
 * @typedef {Object} DeckTypeSpecific
 * @property {number|null} slide_count - Target number of slides
 * @property {number|null} duration_minutes - Presentation length in minutes
 * @property {PresentationContext} presentation_context - Type of presentation
 * @property {VisualStyle} visual_style - Visual approach
 * @property {boolean} include_speaker_notes - Include speaker notes
 * @property {boolean} include_visual_suggestions - Include visual suggestions
 * @property {string[]} slide_structure - Ordered list of slide types
 */

/**
 * Default deck-specific fields
 * @type {DeckTypeSpecific}
 */
export const deckDefaults = {
  slide_count: null,
  duration_minutes: null,
  presentation_context: 'internal',
  visual_style: 'minimal',
  include_speaker_notes: true,
  include_visual_suggestions: true,
  slide_structure: [],
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
 * Infer slide count from duration
 * @param {number} durationMinutes - Presentation duration
 * @returns {number} Estimated slide count
 */
export function inferSlideCount(durationMinutes) {
  // Rule of thumb: ~2 minutes per slide for most presentations
  if (durationMinutes <= 5) return 3;
  if (durationMinutes <= 10) return 5;
  if (durationMinutes <= 15) return 8;
  if (durationMinutes <= 30) return 15;
  if (durationMinutes <= 45) return 22;
  return Math.round(durationMinutes / 2);
}

/**
 * Get recommended visual style based on context
 * @param {PresentationContext} context
 * @returns {VisualStyle}
 */
export function recommendVisualStyle(context) {
  switch (context) {
    case 'keynote':
      return 'image-rich';
    case 'internal':
      return 'minimal';
    case 'pitch':
      return 'image-rich';
    case 'training':
      return 'data-heavy';
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
  
  if (typeSpecific.duration_minutes !== null) {
    if (typeSpecific.duration_minutes < 1) {
      errors.push('Duration must be at least 1 minute');
    }
    if (typeSpecific.duration_minutes > 180) {
      warnings.push('Presentations over 3 hours may need breaks');
    }
  }
  
  return { errors, warnings };
}
