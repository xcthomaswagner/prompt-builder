/**
 * Model Pricing Reference - Cost calculation for LLM usage
 * 
 * Prices are per 1 million tokens as of December 2024.
 * Update these values when provider pricing changes.
 * 
 * @module lib/pricing
 */

/**
 * @typedef {Object} ModelPricing
 * @property {number} input - Cost per 1M input tokens in USD
 * @property {number} output - Cost per 1M output tokens in USD
 */

/**
 * Model pricing table (per 1M tokens)
 * @type {Object.<string, ModelPricing>}
 */
export const MODEL_PRICING = {
  // OpenAI models
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
  
  // Anthropic models
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  
  // Google Gemini models
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-pro-latest': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash-exp': { input: 0.10, output: 0.40 },
  'gemini-pro': { input: 0.50, output: 1.50 },
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
};

/**
 * Get pricing for a specific model
 * 
 * @param {string} modelId - Model identifier
 * @returns {ModelPricing|null} Pricing info or null if unknown
 */
export function getModelPricing(modelId) {
  return MODEL_PRICING[modelId] || null;
}

/**
 * Calculate cost for a specific usage
 * 
 * @param {string} modelId - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number|null} Cost in USD or null if model unknown
 */
export function calculateCost(modelId, inputTokens, outputTokens) {
  const pricing = getModelPricing(modelId);
  if (!pricing) return null;
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  // Round to 6 decimal places for precision
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Format cost for display
 * 
 * @param {number} cost - Cost in USD
 * @param {number} [decimals=4] - Number of decimal places
 * @returns {string} Formatted cost string
 */
export function formatCost(cost, decimals = 4) {
  if (cost === null || cost === undefined) return '—';
  if (cost === 0) return '$0.00';
  if (cost < 0.0001) return '< $0.0001';
  return `$${cost.toFixed(decimals)}`;
}

/**
 * Format token count for display
 * 
 * @param {number} tokens - Token count
 * @returns {string} Formatted token string (e.g., "1.2M", "450K")
 */
export function formatTokens(tokens) {
  if (tokens === null || tokens === undefined) return '—';
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`;
  }
  return tokens.toString();
}

/**
 * Get provider from model ID
 * 
 * @param {string} modelId - Model identifier
 * @returns {'openai' | 'anthropic' | 'gemini' | null} Provider name
 */
export function getProviderFromModel(modelId) {
  if (modelId.startsWith('gpt-')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'gemini';
  return null;
}

/**
 * Aggregate usage data by provider
 * 
 * @param {Array} usageRecords - Array of usage log records
 * @returns {Object} Aggregated data by provider
 */
export function aggregateByProvider(usageRecords) {
  const result = {};
  
  for (const record of usageRecords) {
    const provider = record.provider || getProviderFromModel(record.model);
    if (!provider) continue;
    
    if (!result[provider]) {
      result[provider] = {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedCost: 0,
        byModel: {},
      };
    }
    
    result[provider].totalRequests += 1;
    result[provider].totalInputTokens += record.inputTokens || 0;
    result[provider].totalOutputTokens += record.outputTokens || 0;
    result[provider].estimatedCost += record.estimatedCost || 0;
    
    // Aggregate by model
    const model = record.model;
    if (model) {
      if (!result[provider].byModel[model]) {
        result[provider].byModel[model] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: 0,
        };
      }
      result[provider].byModel[model].requests += 1;
      result[provider].byModel[model].inputTokens += record.inputTokens || 0;
      result[provider].byModel[model].outputTokens += record.outputTokens || 0;
      result[provider].byModel[model].estimatedCost += record.estimatedCost || 0;
    }
  }
  
  return result;
}

/**
 * Aggregate usage data by user
 * 
 * @param {Array} usageRecords - Array of usage log records
 * @returns {Object} Aggregated data by user ID
 */
export function aggregateByUser(usageRecords) {
  const result = {};
  
  for (const record of usageRecords) {
    const userId = record.userId;
    if (!userId) continue;
    
    if (!result[userId]) {
      result[userId] = {
        email: record.userEmail || '',
        requests: 0,
        estimatedCost: 0,
        keySource: record.keySource || 'org',
      };
    }
    
    result[userId].requests += 1;
    result[userId].estimatedCost += record.estimatedCost || 0;
  }
  
  return result;
}

/**
 * Aggregate usage data by feature
 * 
 * @param {Array} usageRecords - Array of usage log records
 * @returns {Object} Aggregated data by feature
 */
export function aggregateByFeature(usageRecords) {
  const result = {};
  
  for (const record of usageRecords) {
    const feature = record.feature || 'unknown';
    
    if (!result[feature]) {
      result[feature] = {
        requests: 0,
        estimatedCost: 0,
      };
    }
    
    result[feature].requests += 1;
    result[feature].estimatedCost += record.estimatedCost || 0;
  }
  
  return result;
}

/**
 * Feature display labels
 */
export const FEATURE_LABELS = {
  prompt_generation: 'Prompt Generation',
  experiment: 'Experiments',
  reverse_prompt: 'Reverse Prompt',
  quality_assessment: 'Quality Assessment',
  unknown: 'Other',
};
