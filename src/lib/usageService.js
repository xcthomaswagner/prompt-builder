/**
 * Usage Service - Track and aggregate LLM API usage
 * 
 * Logs every API call with tokens, cost, model, and feature.
 * Aggregates usage monthly for reporting.
 * 
 * @module lib/usageService
 */

import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { calculateCost, getProviderFromModel } from './pricing';

/**
 * @typedef {Object} UsageLogEntry
 * @property {string} orgId - Organization ID
 * @property {string} userId - User ID
 * @property {string} userEmail - User email for display
 * @property {string} provider - Provider name (openai, anthropic, gemini)
 * @property {string} model - Model ID
 * @property {number} inputTokens - Input token count
 * @property {number} outputTokens - Output token count
 * @property {number} estimatedCost - Estimated cost in USD
 * @property {string} feature - Feature that made the call
 * @property {'user' | 'org'} keySource - Source of the API key used
 * @property {Date} timestamp - When the call was made
 */

/**
 * @typedef {Object} MonthlyAggregate
 * @property {string} orgId - Organization ID
 * @property {string} month - Month in YYYY-MM format
 * @property {number} totalRequests - Total API requests
 * @property {number} totalInputTokens - Total input tokens
 * @property {number} totalOutputTokens - Total output tokens
 * @property {number} totalCost - Total estimated cost
 * @property {Object} byProvider - Breakdown by provider
 * @property {Object} byUser - Breakdown by user
 * @property {Object} byFeature - Breakdown by feature
 */

/**
 * Feature names for tracking
 */
export const FEATURES = {
  PROMPT_GENERATION: 'prompt_generation',
  EXPERIMENT: 'experiment',
  REVERSE_PROMPT: 'reverse_prompt',
  QUALITY_ASSESSMENT: 'quality_assessment',
  AUTO_IMPROVE: 'auto_improve',
  REFINEMENT: 'refinement',
};

/**
 * Log an API usage event
 * 
 * @param {Object} db - Firestore database instance
 * @param {Object} params - Usage parameters
 * @param {string} params.orgId - Organization ID
 * @param {string} params.userId - User ID
 * @param {string} [params.userEmail] - User email
 * @param {string} params.model - Model ID used
 * @param {number} params.inputTokens - Input token count
 * @param {number} params.outputTokens - Output token count
 * @param {string} params.feature - Feature that made the call
 * @param {'user' | 'org'} [params.keySource='org'] - Source of API key
 * @returns {Promise<string>} Log entry ID
 */
export async function logUsage(db, {
  orgId,
  userId,
  userEmail = '',
  model,
  inputTokens,
  outputTokens,
  feature,
  keySource = 'org',
}) {
  if (!db || !orgId || !userId || !model) {
    console.warn('Missing required parameters for usage logging');
    return null;
  }

  const provider = getProviderFromModel(model);
  const estimatedCost = calculateCost(model, inputTokens, outputTokens) || 0;

  const logEntry = {
    orgId,
    userId,
    userEmail,
    provider,
    model,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    estimatedCost,
    feature: feature || 'unknown',
    keySource,
    timestamp: serverTimestamp(),
  };

  try {
    // Add to usage_logs collection
    const logsRef = collection(db, 'organizations', orgId, 'usage_logs');
    const docRef = await addDoc(logsRef, logEntry);

    // Update monthly aggregate
    await updateMonthlyAggregate(db, orgId, logEntry);

    return docRef.id;
  } catch (error) {
    console.error('Failed to log usage:', error);
    return null;
  }
}

/**
 * Update the monthly aggregate document
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {UsageLogEntry} logEntry - The log entry to aggregate
 */
async function updateMonthlyAggregate(db, orgId, logEntry) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const aggregateRef = doc(db, 'organizations', orgId, 'usage_monthly', month);

  try {
    const aggregateSnap = await getDoc(aggregateRef);

    if (!aggregateSnap.exists()) {
      // Create new aggregate document
      await setDoc(aggregateRef, {
        orgId,
        month,
        totalRequests: 1,
        totalInputTokens: logEntry.inputTokens,
        totalOutputTokens: logEntry.outputTokens,
        totalCost: logEntry.estimatedCost,
        byProvider: {
          [logEntry.provider]: {
            requests: 1,
            inputTokens: logEntry.inputTokens,
            outputTokens: logEntry.outputTokens,
            cost: logEntry.estimatedCost,
          },
        },
        byUser: {
          [logEntry.userId]: {
            requests: 1,
            cost: logEntry.estimatedCost,
          },
        },
        byFeature: {
          [logEntry.feature]: {
            requests: 1,
            cost: logEntry.estimatedCost,
          },
        },
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing aggregate
      const data = aggregateSnap.data();
      
      // Update provider stats
      const providerStats = data.byProvider?.[logEntry.provider] || {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      };
      
      // Update user stats
      const userStats = data.byUser?.[logEntry.userId] || {
        requests: 0,
        cost: 0,
      };
      
      // Update feature stats
      const featureStats = data.byFeature?.[logEntry.feature] || {
        requests: 0,
        cost: 0,
      };

      await updateDoc(aggregateRef, {
        totalRequests: increment(1),
        totalInputTokens: increment(logEntry.inputTokens),
        totalOutputTokens: increment(logEntry.outputTokens),
        totalCost: increment(logEntry.estimatedCost),
        [`byProvider.${logEntry.provider}`]: {
          requests: providerStats.requests + 1,
          inputTokens: providerStats.inputTokens + logEntry.inputTokens,
          outputTokens: providerStats.outputTokens + logEntry.outputTokens,
          cost: providerStats.cost + logEntry.estimatedCost,
        },
        [`byUser.${logEntry.userId}`]: {
          requests: userStats.requests + 1,
          cost: userStats.cost + logEntry.estimatedCost,
        },
        [`byFeature.${logEntry.feature}`]: {
          requests: featureStats.requests + 1,
          cost: featureStats.cost + logEntry.estimatedCost,
        },
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Failed to update monthly aggregate:', error);
  }
}

/**
 * Get usage logs for an organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {Object} [options] - Query options
 * @param {number} [options.limit=100] - Max results
 * @param {string} [options.userId] - Filter by user
 * @param {string} [options.provider] - Filter by provider
 * @param {string} [options.feature] - Filter by feature
 * @returns {Promise<UsageLogEntry[]>} Usage logs
 */
export async function getUsageLogs(db, orgId, options = {}) {
  if (!db || !orgId) return [];

  const logsRef = collection(db, 'organizations', orgId, 'usage_logs');
  let q = query(logsRef, orderBy('timestamp', 'desc'), limit(options.limit || 100));

  // Note: Firestore requires composite indexes for multiple where clauses
  // For now, we'll filter in memory for simplicity
  
  try {
    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));

    // Apply filters in memory
    if (options.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }
    if (options.provider) {
      logs = logs.filter(log => log.provider === options.provider);
    }
    if (options.feature) {
      logs = logs.filter(log => log.feature === options.feature);
    }

    return logs;
  } catch (error) {
    console.error('Failed to get usage logs:', error);
    return [];
  }
}

/**
 * Get monthly aggregate for an organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {string} [month] - Month in YYYY-MM format (defaults to current)
 * @returns {Promise<MonthlyAggregate|null>} Monthly aggregate
 */
export async function getMonthlyAggregate(db, orgId, month) {
  if (!db || !orgId) return null;

  const targetMonth = month || getCurrentMonth();
  const aggregateRef = doc(db, 'organizations', orgId, 'usage_monthly', targetMonth);

  try {
    const snapshot = await getDoc(aggregateRef);
    if (!snapshot.exists()) {
      return {
        orgId,
        month: targetMonth,
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        byProvider: {},
        byUser: {},
        byFeature: {},
      };
    }
    return snapshot.data();
  } catch (error) {
    console.error('Failed to get monthly aggregate:', error);
    return null;
  }
}

/**
 * Get usage history for multiple months
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {number} [monthsBack=6] - Number of months to fetch
 * @returns {Promise<MonthlyAggregate[]>} Monthly aggregates
 */
export async function getUsageHistory(db, orgId, monthsBack = 6) {
  if (!db || !orgId) return [];

  const months = getLastNMonths(monthsBack);
  const results = [];

  for (const month of months) {
    const aggregate = await getMonthlyAggregate(db, orgId, month);
    if (aggregate) {
      results.push(aggregate);
    }
  }

  return results;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get last N months in YYYY-MM format
 */
export function getLastNMonths(n) {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  
  return months;
}

/**
 * Calculate total usage for a user across all time
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's total usage
 */
export async function getUserTotalUsage(db, orgId, userId) {
  if (!db || !orgId || !userId) return null;

  const history = await getUsageHistory(db, orgId, 12);
  
  let totalRequests = 0;
  let totalCost = 0;

  for (const month of history) {
    const userStats = month.byUser?.[userId];
    if (userStats) {
      totalRequests += userStats.requests || 0;
      totalCost += userStats.cost || 0;
    }
  }

  return {
    userId,
    totalRequests,
    totalCost,
  };
}

/**
 * Create a usage logger function bound to context
 * Useful for passing to LLM service calls
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID
 * @param {string} [userEmail] - User email
 * @param {'user' | 'org'} [keySource='org'] - Key source
 * @returns {Function} Logger function
 */
export function createUsageLogger(db, orgId, userId, userEmail = '', keySource = 'org') {
  return async (model, inputTokens, outputTokens, feature) => {
    return logUsage(db, {
      orgId,
      userId,
      userEmail,
      model,
      inputTokens,
      outputTokens,
      feature,
      keySource,
    });
  };
}
