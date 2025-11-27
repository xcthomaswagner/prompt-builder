/**
 * Copy-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to marketing copy generation.
 * 
 * @module promptSpecs/templates/copy
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'ad'|'landing'|'email'|'social'|'press'|'tagline'|'product'} CopyType
 */

/**
 * @typedef {'fear'|'aspiration'|'urgency'|'trust'|'curiosity'|'exclusivity'} EmotionalAppeal
 */

/**
 * @typedef {Object} CopyTypeSpecific
 * @property {CopyType} copy_type - Type of copy
 * @property {string|null} cta_type - Call to action style
 * @property {EmotionalAppeal} emotional_appeal - Primary emotional driver
 * @property {string|null} brand_voice - Brand personality
 * @property {string|null} platform - Where it will appear
 */

/**
 * Default copy-specific fields
 * @type {CopyTypeSpecific}
 */
export const copyDefaults = {
  copy_type: 'landing',
  cta_type: null,
  emotional_appeal: 'aspiration',
  brand_voice: null,
  platform: null,
};

/**
 * Common CTAs by copy type
 */
export const CTA_SUGGESTIONS = {
  ad: ['Shop Now', 'Learn More', 'Get Started', 'Try Free'],
  landing: ['Sign Up', 'Get Started', 'Request Demo', 'Download Now'],
  email: ['Read More', 'Shop Now', 'Claim Offer', 'Book Now'],
  social: ['Link in Bio', 'Swipe Up', 'Comment Below', 'Share'],
  press: ['Contact Us', 'Learn More', 'Read Full Release'],
  product: ['Add to Cart', 'Buy Now', 'Pre-Order', 'Subscribe'],
};

/**
 * Create a Copy Prompt Spec with copy-specific defaults
 * @returns {import('../schema.js').BasePromptSpec}
 */
export function createCopySpec() {
  const spec = createBaseSpec('copy');
  spec.typeSpecific = { ...copyDefaults };
  return spec;
}

/**
 * Get CTA suggestions for copy type
 * @param {CopyType} copyType
 * @returns {string[]}
 */
export function getCTASuggestions(copyType) {
  return CTA_SUGGESTIONS[copyType] || CTA_SUGGESTIONS.landing;
}

/**
 * Validate copy-specific fields
 * @param {CopyTypeSpecific} typeSpecific
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateCopySpec(typeSpecific) {
  const errors = [];
  const warnings = [];
  
  if (typeSpecific.copy_type === 'social' && !typeSpecific.platform) {
    warnings.push('Social copy benefits from knowing the target platform');
  }
  
  if (typeSpecific.emotional_appeal === 'fear' && typeSpecific.copy_type === 'social') {
    warnings.push('Fear-based appeals may perform poorly on social platforms');
  }
  
  return { errors, warnings };
}
