/**
 * Outcome Store
 * 
 * Stores and retrieves user outcome feedback for learning.
 * 
 * @module learning/outcomeStore
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Outcome record schema
 * @typedef {Object} OutcomeRecord
 * @property {string} promptId - Reference to the generated prompt
 * @property {Object} specSnapshot - Copy of the spec used
 * @property {'positive'|'negative'} rating - User rating
 * @property {'used_as_is'|'small_edits'|'major_edits'|'abandoned'} outcome - What happened
 * @property {string[]} editsNeeded - What changes were needed
 * @property {string} feedback - Free-form feedback
 * @property {Date} createdAt - When recorded
 */

/**
 * Record a user outcome
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {OutcomeRecord} outcome - Outcome data
 * @returns {Promise<string>} Document ID
 */
export async function recordOutcome(db, userId, outcome) {
  if (!db || !userId) {
    console.warn('Cannot record outcome: missing db or userId');
    return null;
  }

  try {
    const outcomesRef = collection(db, 'users', userId, 'prompt_outcomes');
    
    const docRef = await addDoc(outcomesRef, {
      ...outcome,
      createdAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Failed to record outcome:', error);
    throw error;
  }
}

/**
 * Get outcome statistics for a user
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Object>} Statistics
 */
export async function getOutcomeStats(db, userId, filters = {}) {
  if (!db || !userId) {
    return getEmptyStats();
  }

  try {
    const outcomesRef = collection(db, 'users', userId, 'prompt_outcomes');
    const snapshot = await getDocs(outcomesRef);
    const outcomes = snapshot.docs.map(doc => doc.data());
    
    if (outcomes.length === 0) {
      return getEmptyStats();
    }

    // Calculate statistics
    const total = outcomes.length;
    const positive = outcomes.filter(o => o.rating === 'positive').length;
    const usedAsIs = outcomes.filter(o => o.outcome === 'used_as_is').length;
    
    // Extract common edits
    const editCounts = {};
    outcomes.forEach(o => {
      (o.editsNeeded || []).forEach(edit => {
        editCounts[edit] = (editCounts[edit] || 0) + 1;
      });
    });
    
    const commonEdits = Object.entries(editCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([edit, count]) => ({ edit, count }));

    // Group by output type
    const byOutputType = {};
    outcomes.forEach(o => {
      const type = o.specSnapshot?.outputType || 'unknown';
      if (!byOutputType[type]) {
        byOutputType[type] = { total: 0, positive: 0, usedAsIs: 0 };
      }
      byOutputType[type].total++;
      if (o.rating === 'positive') byOutputType[type].positive++;
      if (o.outcome === 'used_as_is') byOutputType[type].usedAsIs++;
    });

    return {
      total,
      positiveRate: total > 0 ? positive / total : 0,
      usedAsIsRate: total > 0 ? usedAsIs / total : 0,
      commonEdits,
      byOutputType,
    };
  } catch (error) {
    console.error('Failed to get outcome stats:', error);
    return getEmptyStats();
  }
}

/**
 * Get recent outcomes for a user
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {number} [count=10] - Number of outcomes to retrieve
 * @returns {Promise<OutcomeRecord[]>}
 */
export async function getRecentOutcomes(db, userId, count = 10) {
  if (!db || !userId) {
    return [];
  }

  try {
    const outcomesRef = collection(db, 'users', userId, 'prompt_outcomes');
    const q = query(
      outcomesRef,
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to get recent outcomes:', error);
    return [];
  }
}

/**
 * Get empty stats object
 * @returns {Object}
 */
function getEmptyStats() {
  return {
    total: 0,
    positiveRate: 0,
    usedAsIsRate: 0,
    commonEdits: [],
    byOutputType: {},
  };
}
