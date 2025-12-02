/**
 * Learning Module
 * 
 * Public API for the learning loop and user preferences.
 * 
 * @module learning
 */

/**
 * Outcome tracking and analytics
 */
export { 
  recordOutcome, 
  getOutcomeStats, 
  getRecentOutcomes 
} from './outcomeStore.js';

/**
 * User preference management and learning
 */
export { 
  getUserPreferences, 
  saveUserPreferences, 
  learnFromOutcome, 
  applyPreferences,
  getPreferenceSuggestions,
} from './preferences.js';
