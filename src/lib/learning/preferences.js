/**
 * Preferences Learning
 * 
 * Learns user preferences from outcome data.
 * 
 * @module learning/preferences
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * User preferences schema
 * @typedef {Object} UserPreferences
 * @property {Object<string, number>} successfulSettings - Settings that worked well
 * @property {string[]} commonIssues - Common issues to avoid
 * @property {Object<string, Object>} typePreferences - Per-type preferences
 * @property {Date} lastUpdated - When preferences were last updated
 */

/**
 * Get user preferences
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @returns {Promise<UserPreferences>}
 */
export async function getUserPreferences(db, userId) {
  if (!db || !userId) {
    return getDefaultPreferences();
  }

  try {
    const prefRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snapshot = await getDoc(prefRef);
    
    if (snapshot.exists()) {
      return snapshot.data();
    }
    
    return getDefaultPreferences();
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    return getDefaultPreferences();
  }
}

/**
 * Save user preferences
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {UserPreferences} preferences - Preferences to save
 */
export async function saveUserPreferences(db, userId, preferences) {
  if (!db || !userId) {
    console.warn('Cannot save preferences: missing db or userId');
    return;
  }

  try {
    const prefRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(prefRef, {
      ...preferences,
      lastUpdated: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    throw error;
  }
}

/**
 * Learn from an outcome and update preferences
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {Object} outcome - Outcome record
 */
export async function learnFromOutcome(db, userId, outcome) {
  if (!db || !userId || !outcome) {
    return;
  }

  try {
    const preferences = await getUserPreferences(db, userId);
    const spec = outcome.specSnapshot;
    
    // Positive outcome with used_as_is: reinforce these settings
    if (outcome.rating === 'positive' && outcome.outcome === 'used_as_is') {
      const key = buildSettingsKey(spec);
      preferences.successfulSettings = preferences.successfulSettings || {};
      preferences.successfulSettings[key] = (preferences.successfulSettings[key] || 0) + 1;
      
      // Track type-specific success
      if (spec.outputType) {
        preferences.typePreferences = preferences.typePreferences || {};
        preferences.typePreferences[spec.outputType] = preferences.typePreferences[spec.outputType] || {};
        preferences.typePreferences[spec.outputType].successCount = 
          (preferences.typePreferences[spec.outputType].successCount || 0) + 1;
      }
    }
    
    // Negative outcome: learn what to avoid
    if (outcome.rating === 'negative') {
      preferences.commonIssues = preferences.commonIssues || [];
      
      // Add new issues, avoiding duplicates
      (outcome.editsNeeded || []).forEach(issue => {
        if (!preferences.commonIssues.includes(issue)) {
          preferences.commonIssues.push(issue);
        }
      });
      
      // Keep only the most recent 20 issues
      if (preferences.commonIssues.length > 20) {
        preferences.commonIssues = preferences.commonIssues.slice(-20);
      }
    }
    
    await saveUserPreferences(db, userId, preferences);
  } catch (error) {
    console.error('Failed to learn from outcome:', error);
  }
}

/**
 * Apply learned preferences to a spec
 * @param {Object} spec - Prompt spec
 * @param {UserPreferences} preferences - User preferences
 * @returns {Object} Modified spec with preference-based suggestions
 */
export function applyPreferences(spec, preferences) {
  if (!preferences || !spec) {
    return spec;
  }

  const modified = { ...spec };
  
  // Add warnings based on common issues
  if (preferences.commonIssues?.length > 0) {
    modified.quality = modified.quality || {};
    modified.quality.anti_patterns = modified.quality.anti_patterns || [];
    
    // Add relevant warnings
    if (preferences.commonIssues.includes('More specific')) {
      modified.quality.anti_patterns.push(
        'Being too vague (based on your history, you often need more specificity)'
      );
    }
    if (preferences.commonIssues.includes('Different tone')) {
      modified.quality.anti_patterns.push(
        'Mismatched tone (consider your past preferences)'
      );
    }
  }
  
  // Add reasoning about preferences
  if (preferences.successfulSettings) {
    const key = buildSettingsKey(spec);
    const successCount = preferences.successfulSettings[key];
    
    if (successCount && successCount >= 2) {
      modified.inferred = modified.inferred || {};
      modified.inferred.reasoning = modified.inferred.reasoning || {};
      modified.inferred.reasoning.history = 
        `These settings have worked well for you ${successCount} times before`;
    }
  }
  
  return modified;
}

/**
 * Build a settings key for tracking
 * @param {Object} spec
 * @returns {string}
 */
function buildSettingsKey(spec) {
  const parts = [
    spec.outputType || 'unknown',
    spec.inferred?.tone || 'default',
    spec.inferred?.format || 'default',
  ];
  return parts.join(':');
}

/**
 * Get default preferences
 * @returns {UserPreferences}
 */
function getDefaultPreferences() {
  return {
    successfulSettings: {},
    commonIssues: [],
    typePreferences: {},
    lastUpdated: null,
  };
}

/**
 * Get preference-based suggestions
 * @param {UserPreferences} preferences
 * @param {string} outputType
 * @returns {Object} Suggestions
 */
export function getPreferenceSuggestions(preferences, outputType) {
  if (!preferences) {
    return { suggestions: [], warnings: [] };
  }

  const suggestions = [];
  const warnings = [];
  
  // Check for successful settings for this type
  const typePrefs = preferences.typePreferences?.[outputType];
  if (typePrefs?.successCount >= 3) {
    suggestions.push(`You've had ${typePrefs.successCount} successful prompts of this type`);
  }
  
  // Check for common issues
  if (preferences.commonIssues?.length > 0) {
    warnings.push(`Watch out for: ${preferences.commonIssues.slice(0, 3).join(', ')}`);
  }
  
  return { suggestions, warnings };
}
