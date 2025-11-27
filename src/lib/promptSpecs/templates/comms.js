/**
 * Comms-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to communication generation.
 * 
 * @module promptSpecs/templates/comms
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'email'|'slack'|'memo'|'letter'|'sms'|'chat'} Channel
 */

/**
 * @typedef {'low'|'normal'|'high'|'asap'} ResponseUrgency
 */

/**
 * @typedef {'casual'|'professional'|'formal'} FormalityLevel
 */

/**
 * @typedef {Object} CommsTypeSpecific
 * @property {Channel} channel - Communication channel
 * @property {string|null} thread_context - Reply-to context
 * @property {ResponseUrgency} response_urgency - Expected response time
 * @property {FormalityLevel} formality_level - Level of formality
 * @property {boolean} include_greeting - Include greeting
 * @property {boolean} include_signature - Include signature
 * @property {string[]} action_items - Explicit asks
 */

/**
 * Default comms-specific fields
 * @type {CommsTypeSpecific}
 */
export const commsDefaults = {
  channel: 'email',
  thread_context: null,
  response_urgency: 'normal',
  formality_level: 'professional',
  include_greeting: true,
  include_signature: true,
  action_items: [],
};

/**
 * Channel characteristics
 */
export const CHANNEL_TRAITS = {
  email: { maxLength: 500, supportsFormatting: true, async: true },
  slack: { maxLength: 300, supportsFormatting: true, async: false },
  memo: { maxLength: 800, supportsFormatting: true, async: true },
  letter: { maxLength: 1000, supportsFormatting: false, async: true },
  sms: { maxLength: 160, supportsFormatting: false, async: false },
  chat: { maxLength: 200, supportsFormatting: false, async: false },
};

/**
 * Create a Comms Prompt Spec with comms-specific defaults
 * @returns {import('../schema.js').BasePromptSpec}
 */
export function createCommsSpec() {
  const spec = createBaseSpec('comms');
  spec.typeSpecific = { ...commsDefaults };
  return spec;
}

/**
 * Get recommended formality based on relationship
 * @param {string} relationship - subordinate|peer|superior|customer|public
 * @returns {FormalityLevel}
 */
export function recommendFormality(relationship) {
  switch (relationship) {
    case 'subordinate':
      return 'professional';
    case 'peer':
      return 'casual';
    case 'superior':
      return 'formal';
    case 'customer':
      return 'professional';
    case 'public':
      return 'formal';
    default:
      return 'professional';
  }
}

/**
 * Get channel traits
 * @param {Channel} channel
 * @returns {{ maxLength: number, supportsFormatting: boolean, async: boolean }}
 */
export function getChannelTraits(channel) {
  return CHANNEL_TRAITS[channel] || CHANNEL_TRAITS.email;
}

/**
 * Validate comms-specific fields
 * @param {CommsTypeSpecific} typeSpecific
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateCommsSpec(typeSpecific) {
  const errors = [];
  const warnings = [];
  
  if (typeSpecific.channel === 'sms' && typeSpecific.action_items.length > 1) {
    warnings.push('SMS with multiple action items may be too long');
  }
  
  if (typeSpecific.channel === 'slack' && typeSpecific.formality_level === 'formal') {
    warnings.push('Formal tone may feel out of place in Slack');
  }
  
  if (typeSpecific.channel === 'letter' && !typeSpecific.include_signature) {
    warnings.push('Letters typically include a signature');
  }
  
  if (typeSpecific.response_urgency === 'asap' && typeSpecific.channel === 'letter') {
    warnings.push('Letters are not suitable for urgent communications');
  }
  
  if (typeSpecific.thread_context && typeSpecific.include_greeting) {
    warnings.push('Replies in a thread may not need a full greeting');
  }
  
  return { errors, warnings };
}
