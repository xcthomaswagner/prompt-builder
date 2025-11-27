/**
 * Feature Flags
 * 
 * Controls gradual rollout of new features.
 * Flags can be overridden via localStorage for testing.
 * 
 * @module featureFlags
 */

/**
 * Default flag values
 */
export const FLAGS = {
  // Phase 2: Split pipeline
  USE_SPLIT_PIPELINE: false,
  
  // Phase 3: Type-specific forms
  SHOW_TYPE_SPECIFIC_FORMS: false,
  
  // Phase 4: Quality feedback
  SHOW_QUALITY_FEEDBACK: false,
  
  // Phase 5: Reasoning panel
  SHOW_REASONING_PANEL: false,
  
  // Phase 6: Quick-start templates
  SHOW_TEMPLATES: false,
  
  // Phase 7: Learning loop
  ENABLE_LEARNING_LOOP: false,
};

/**
 * Check if a feature flag is enabled
 * @param {string} flag - Flag name
 * @returns {boolean}
 */
export function isEnabled(flag) {
  // Check localStorage override first
  if (typeof window !== 'undefined' && window.localStorage) {
    const override = localStorage.getItem(`flag_${flag}`);
    if (override === 'true') return true;
    if (override === 'false') return false;
  }
  
  // Check environment variable override
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envKey = `VITE_FLAG_${flag}`;
    if (import.meta.env[envKey] === 'true') return true;
    if (import.meta.env[envKey] === 'false') return false;
  }
  
  // Return default
  return FLAGS[flag] ?? false;
}

/**
 * Enable a flag (persists to localStorage)
 * @param {string} flag - Flag name
 */
export function enableFlag(flag) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(`flag_${flag}`, 'true');
  }
}

/**
 * Disable a flag (persists to localStorage)
 * @param {string} flag - Flag name
 */
export function disableFlag(flag) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(`flag_${flag}`, 'false');
  }
}

/**
 * Reset a flag to default (removes localStorage override)
 * @param {string} flag - Flag name
 */
export function resetFlag(flag) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(`flag_${flag}`);
  }
}

/**
 * Reset all flags to defaults
 */
export function resetAllFlags() {
  Object.keys(FLAGS).forEach(resetFlag);
}

/**
 * Get all flag states (for debugging)
 * @returns {Object<string, boolean>}
 */
export function getAllFlags() {
  const result = {};
  Object.keys(FLAGS).forEach(flag => {
    result[flag] = isEnabled(flag);
  });
  return result;
}

/**
 * Console helper for debugging flags
 * Call window.__flags() in browser console
 */
if (typeof window !== 'undefined') {
  window.__flags = getAllFlags;
  window.__enableFlag = enableFlag;
  window.__disableFlag = disableFlag;
  window.__resetFlags = resetAllFlags;
}
