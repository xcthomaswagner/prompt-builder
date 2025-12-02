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
  
  // Split by whitespace
  const words = text.trim().split(/\s+/);
  
  // More accurate heuristic: 
  // - Short words (1-3 chars): ~1 token
  // - Medium words (4-7 chars): ~1.5 tokens  
  // - Long words (8+ chars): ~2 tokens
  // Average: ~1.3 tokens per word
  const tokens = words.reduce((count, word) => {
    if (word.length <= 3) return count + 1;
    if (word.length <= 7) return count + 1.5;
    return count + 2;
  }, 0);
  
  return Math.ceil(tokens);
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
