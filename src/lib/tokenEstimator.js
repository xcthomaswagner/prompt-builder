/**
 * Token Estimation Utilities
 * 
 * Provides rough token count estimates for text input.
 * Useful for UI feedback and API quota management.
 */

/**
 * Estimate token count for given text
 * Uses heuristic: ~1.3 tokens per word on average
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  if (!text) return 0;
  
  // Split by whitespace and punctuation
  const words = text.trim().split(/\s+/);
  
  // Average: 1 word ≈ 1.3 tokens (accounting for punctuation and subword tokens)
  const tokens = words.reduce((count, word) => {
    return count + Math.ceil(word.length / 4);
  }, 0);
  
  return tokens;
}

/**
 * Format token count for display
 * 
 * @param {number} tokens - Token count
 * @returns {string} Formatted string (e.g., "1.2K tokens")
 */
export function formatTokenCount(tokens) {
  if (tokens < 1000) return `${tokens} tokens`;
  return `${(tokens / 1000).toFixed(1)}K tokens`;
}

/**
 * Check if token count exceeds limit
 * 
 * @param {number} tokens - Token count
 * @param {number} limit - Token limit
 * @returns {boolean} True if over limit
 */
export function isOverTokenLimit(tokens, limit) {
  return tokens > limit;
}
