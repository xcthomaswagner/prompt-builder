/**
 * Balance Service - Fetch API credit balances from providers
 * 
 * Supports automatic fetching for OpenAI and Anthropic.
 * Gemini requires manual entry (no balance API).
 * 
 * @module lib/balanceService
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @typedef {Object} BalanceInfo
 * @property {number|null} balance - Current balance in USD
 * @property {number|null} limit - Credit limit (if applicable)
 * @property {number|null} used - Amount used
 * @property {string} currency - Currency code
 * @property {Date|null} fetchedAt - When balance was last fetched
 * @property {string|null} error - Error message if fetch failed
 * @property {'auto' | 'manual'} source - How balance was obtained
 */

/**
 * Fetch OpenAI account balance
 * Uses the /dashboard/billing/credit_grants endpoint
 * 
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<BalanceInfo>} Balance information
 */
export async function fetchOpenAIBalance(apiKey) {
  if (!apiKey) {
    return { balance: null, error: 'No API key provided', source: 'auto' };
  }

  try {
    // OpenAI billing API - get credit grants
    const response = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { balance: null, error: 'Invalid API key', source: 'auto' };
      }
      if (response.status === 403) {
        return { balance: null, error: 'API key lacks billing permissions', source: 'auto' };
      }
      return { balance: null, error: `API error: ${response.status}`, source: 'auto' };
    }

    const data = await response.json();
    
    // Calculate remaining balance from grants
    const totalGranted = data.total_granted || 0;
    const totalUsed = data.total_used || 0;
    const balance = totalGranted - totalUsed;

    return {
      balance: Math.max(0, balance),
      limit: totalGranted,
      used: totalUsed,
      currency: 'USD',
      fetchedAt: new Date(),
      error: null,
      source: 'auto',
    };
  } catch (error) {
    console.error('Failed to fetch OpenAI balance:', error);
    return { 
      balance: null, 
      error: error.message || 'Network error', 
      source: 'auto' 
    };
  }
}

/**
 * Fetch Anthropic account balance
 * Note: Anthropic doesn't have a public billing API yet
 * This is a placeholder that returns manual entry requirement
 * 
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<BalanceInfo>} Balance information
 */
export async function fetchAnthropicBalance(apiKey) {
  if (!apiKey) {
    return { balance: null, error: 'No API key provided', source: 'auto' };
  }

  // Anthropic doesn't have a public billing API
  // Users need to check console.anthropic.com manually
  return {
    balance: null,
    error: 'Anthropic requires manual balance entry. Check console.anthropic.com',
    source: 'manual',
    fetchedAt: new Date(),
  };
}

/**
 * Get Gemini balance info
 * Gemini (Google AI) doesn't have a balance API - it's usage-based billing
 * 
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<BalanceInfo>} Balance information
 */
export async function fetchGeminiBalance(apiKey) {
  if (!apiKey) {
    return { balance: null, error: 'No API key provided', source: 'auto' };
  }

  // Gemini uses Google Cloud billing - no direct balance API
  return {
    balance: null,
    error: 'Gemini requires manual balance entry. Check Google Cloud Console',
    source: 'manual',
    fetchedAt: new Date(),
  };
}

/**
 * Fetch balance for a specific provider
 * 
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key
 * @returns {Promise<BalanceInfo>} Balance information
 */
export async function fetchProviderBalance(provider, apiKey) {
  switch (provider) {
    case 'openai':
      return fetchOpenAIBalance(apiKey);
    case 'anthropic':
      return fetchAnthropicBalance(apiKey);
    case 'gemini':
      return fetchGeminiBalance(apiKey);
    default:
      return { balance: null, error: 'Unknown provider', source: 'auto' };
  }
}

/**
 * Fetch all provider balances
 * 
 * @param {Object} apiKeys - Object with provider keys
 * @returns {Promise<Object>} Balances by provider
 */
export async function fetchAllBalances(apiKeys) {
  const results = {};
  
  const providers = ['openai', 'anthropic', 'gemini'];
  
  await Promise.all(
    providers.map(async (provider) => {
      results[provider] = await fetchProviderBalance(provider, apiKeys[provider]);
    })
  );
  
  return results;
}

/**
 * Save manual balance entry to organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {string} provider - Provider name
 * @param {number} balance - Balance amount
 * @returns {Promise<void>}
 */
export async function saveManualBalance(db, orgId, provider, balance) {
  if (!db || !orgId || !provider) {
    throw new Error('Missing required parameters');
  }

  const orgRef = doc(db, 'organizations', orgId);
  
  await updateDoc(orgRef, {
    [`balances.${provider}`]: {
      balance,
      currency: 'USD',
      fetchedAt: serverTimestamp(),
      source: 'manual',
      error: null,
    },
  });
}

/**
 * Get stored balances from organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} Stored balances
 */
export async function getStoredBalances(db, orgId) {
  if (!db || !orgId) return {};

  try {
    const orgRef = doc(db, 'organizations', orgId);
    const orgSnap = await getDoc(orgRef);
    
    if (!orgSnap.exists()) return {};
    
    return orgSnap.data().balances || {};
  } catch (error) {
    console.error('Failed to get stored balances:', error);
    return {};
  }
}

/**
 * Refresh and store balances for an organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {Object} apiKeys - API keys by provider
 * @returns {Promise<Object>} Updated balances
 */
export async function refreshAndStoreBalances(db, orgId, apiKeys) {
  if (!db || !orgId) {
    throw new Error('Missing required parameters');
  }

  const balances = await fetchAllBalances(apiKeys);
  
  // Store balances that were successfully fetched
  const orgRef = doc(db, 'organizations', orgId);
  const updates = {};
  
  for (const [provider, balance] of Object.entries(balances)) {
    if (balance.balance !== null || balance.source === 'manual') {
      updates[`balances.${provider}`] = {
        ...balance,
        fetchedAt: serverTimestamp(),
      };
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await updateDoc(orgRef, updates);
  }
  
  return balances;
}

/**
 * Format balance for display
 * 
 * @param {BalanceInfo} balanceInfo - Balance information
 * @returns {string} Formatted balance string
 */
export function formatBalance(balanceInfo) {
  if (!balanceInfo) return '—';
  if (balanceInfo.error && balanceInfo.balance === null) return 'N/A';
  if (balanceInfo.balance === null) return '—';
  
  return `$${balanceInfo.balance.toFixed(2)}`;
}

/**
 * Get balance status for UI display
 * 
 * @param {BalanceInfo} balanceInfo - Balance information
 * @param {number} [warningThreshold=10] - Warning threshold in USD
 * @param {number} [criticalThreshold=5] - Critical threshold in USD
 * @returns {'ok' | 'warning' | 'critical' | 'unknown'} Status
 */
export function getBalanceStatus(balanceInfo, warningThreshold = 10, criticalThreshold = 5) {
  if (!balanceInfo || balanceInfo.balance === null) return 'unknown';
  
  if (balanceInfo.balance <= criticalThreshold) return 'critical';
  if (balanceInfo.balance <= warningThreshold) return 'warning';
  return 'ok';
}

/**
 * Check if balance needs refresh (older than threshold)
 * 
 * @param {BalanceInfo} balanceInfo - Balance information
 * @param {number} [maxAgeMs=3600000] - Max age in milliseconds (default 1 hour)
 * @returns {boolean} Whether balance needs refresh
 */
export function needsRefresh(balanceInfo, maxAgeMs = 3600000) {
  if (!balanceInfo || !balanceInfo.fetchedAt) return true;
  
  const fetchedAt = balanceInfo.fetchedAt instanceof Date 
    ? balanceInfo.fetchedAt 
    : balanceInfo.fetchedAt.toDate?.() || new Date(balanceInfo.fetchedAt);
  
  return Date.now() - fetchedAt.getTime() > maxAgeMs;
}
