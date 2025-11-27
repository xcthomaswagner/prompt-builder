/**
 * Learning Module
 * 
 * Public API for the learning loop.
 * 
 * @module learning
 */

export { 
  recordOutcome, 
  getOutcomeStats, 
  getRecentOutcomes 
} from './outcomeStore.js';

export { 
  getUserPreferences, 
  saveUserPreferences, 
  learnFromOutcome, 
  applyPreferences,
  getPreferenceSuggestions,
} from './preferences.js';
