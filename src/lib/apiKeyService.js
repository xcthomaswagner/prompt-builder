/**
 * API Key Service - Hierarchical key resolution and management
 * 
 * Resolves API keys with priority: user personal key → org key → null
 * Supports enterprise mode where org keys are required.
 * 
 * @module lib/apiKeyService
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @typedef {Object} ResolvedKey
 * @property {string|null} key - The resolved API key
 * @property {'user' | 'org' | null} source - Where the key came from
 * @property {string} [provider] - Provider name
 */

/**
 * @typedef {Object} KeyResolutionContext
 * @property {Object} db - Firestore database instance
 * @property {string} userId - Current user ID
 * @property {string} orgId - Organization ID
 * @property {string} provider - Provider name ('openai', 'anthropic', 'gemini')
 */

/**
 * Resolve an API key for a provider with fallback logic
 * 
 * Priority:
 * 1. User personal key (if allowUserKeys is true)
 * 2. Organization key
 * 3. null (no key available)
 * 
 * @param {KeyResolutionContext} context - Resolution context
 * @returns {Promise<ResolvedKey>} Resolved key info
 */
export async function resolveApiKey({ db, userId, orgId, provider }) {
  if (!db || !userId || !provider) {
    return { key: null, source: null, provider };
  }

  // Default org ID if not provided
  const effectiveOrgId = orgId || `org_${userId}`;

  try {
    // Fetch organization data
    const orgRef = doc(db, 'organizations', effectiveOrgId);
    const orgSnap = await getDoc(orgRef);
    
    if (!orgSnap.exists()) {
      // No org exists, check user keys only
      return await resolveUserKey(db, userId, provider);
    }

    const orgData = orgSnap.data();
    const orgSettings = orgData.settings || {};

    // Enterprise mode: org keys only
    if (orgSettings.requireOrgKeys) {
      const orgKey = orgData.apiKeys?.[provider]?.key;
      return {
        key: orgKey || null,
        source: orgKey ? 'org' : null,
        provider,
      };
    }

    // Check user keys first (if allowed)
    if (orgSettings.allowUserKeys !== false) {
      const userKey = await resolveUserKey(db, userId, provider);
      if (userKey.key) {
        return userKey;
      }
    }

    // Fall back to org key
    const orgKey = orgData.apiKeys?.[provider]?.key;
    return {
      key: orgKey || null,
      source: orgKey ? 'org' : null,
      provider,
    };
  } catch (error) {
    console.error('Error resolving API key:', error);
    return { key: null, source: null, provider };
  }
}

/**
 * Resolve user's personal API key
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @returns {Promise<ResolvedKey>} User's key info
 */
async function resolveUserKey(db, userId, provider) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { key: null, source: null, provider };
    }

    const userData = userSnap.data();
    const userKey = userData.apiKeys?.[provider]?.key;
    
    return {
      key: userKey || null,
      source: userKey ? 'user' : null,
      provider,
    };
  } catch (error) {
    console.error('Error fetching user key:', error);
    return { key: null, source: null, provider };
  }
}

/**
 * Resolve all API keys for a user
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} [orgId] - Organization ID
 * @returns {Promise<Object>} Object with resolved keys for each provider
 */
export async function resolveAllKeys(db, userId, orgId) {
  const providers = ['openai', 'anthropic', 'gemini'];
  const results = {};

  await Promise.all(
    providers.map(async (provider) => {
      results[provider] = await resolveApiKey({ db, userId, orgId, provider });
    })
  );

  return results;
}

/**
 * Get user's personal API keys
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User's API keys by provider
 */
export async function getUserApiKeys(db, userId) {
  if (!db || !userId) return {};

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return {};
    }

    return userSnap.data().apiKeys || {};
  } catch (error) {
    console.error('Error fetching user API keys:', error);
    return {};
  }
}

/**
 * Save a personal API key for a user
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @param {string} key - API key to save
 * @param {Object} [metadata] - Additional metadata (testStatus, etc.)
 * @returns {Promise<void>}
 */
export async function saveUserApiKey(db, userId, provider, key, metadata = {}) {
  if (!db || !userId || !provider) {
    throw new Error('Missing required parameters');
  }

  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    [`apiKeys.${provider}`]: {
      key,
      addedAt: serverTimestamp(),
      ...metadata,
    },
  }).catch(async (error) => {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(userRef, {
        apiKeys: {
          [provider]: {
            key,
            addedAt: serverTimestamp(),
            ...metadata,
          },
        },
      }, { merge: true });
    } else {
      throw error;
    }
  });
}

/**
 * Remove a personal API key for a user
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @returns {Promise<void>}
 */
export async function removeUserApiKey(db, userId, provider) {
  if (!db || !userId || !provider) {
    throw new Error('Missing required parameters');
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;

  const currentKeys = userSnap.data().apiKeys || {};
  const { [provider]: removed, ...remainingKeys } = currentKeys;

  await updateDoc(userRef, {
    apiKeys: remainingKeys,
  });
}

/**
 * Check if user has a personal key for a provider
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>}
 */
export async function hasUserKey(db, userId, provider) {
  const keys = await getUserApiKeys(db, userId);
  return !!keys[provider]?.key;
}

/**
 * Get the effective API keys object for LLM calls
 * Maps resolved keys to the format expected by llmService
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} [orgId] - Organization ID
 * @param {Object} [localKeys] - Local/localStorage keys as fallback
 * @returns {Promise<Object>} Keys object { gemini, openai, anthropic }
 */
export async function getEffectiveApiKeys(db, userId, orgId, localKeys = {}) {
  const resolved = await resolveAllKeys(db, userId, orgId);
  
  return {
    gemini: resolved.gemini?.key || localKeys.gemini || null,
    openai: resolved.openai?.key || localKeys.openai || null,
    anthropic: resolved.anthropic?.key || localKeys.anthropic || null,
  };
}

/**
 * Get key source info for display
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} [orgId] - Organization ID
 * @returns {Promise<Object>} Source info by provider
 */
export async function getKeySourceInfo(db, userId, orgId) {
  const resolved = await resolveAllKeys(db, userId, orgId);
  
  return {
    gemini: resolved.gemini?.source,
    openai: resolved.openai?.source,
    anthropic: resolved.anthropic?.source,
  };
}
