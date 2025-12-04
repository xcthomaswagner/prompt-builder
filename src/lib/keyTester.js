/**
 * API Key Tester - Validates API keys for each provider
 * 
 * Uses minimal API calls to verify key validity without incurring significant costs.
 * 
 * @module lib/keyTester
 */

/**
 * @typedef {Object} KeyTestResult
 * @property {boolean} valid - Whether the key is valid
 * @property {string|null} error - Error message if invalid
 * @property {Object} [details] - Additional details from the API
 */

/**
 * Test an OpenAI API key by listing models
 * 
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<KeyTestResult>} Test result
 */
async function testOpenAIKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true, error: null };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (response.status === 429) {
      return { valid: false, error: 'Rate limited - key may be valid but quota exceeded' };
    }
    
    return { valid: false, error: errorMessage };
  } catch (error) {
    return { valid: false, error: `Network error: ${error.message}` };
  }
}

/**
 * Test an Anthropic API key with a minimal completion
 * 
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<KeyTestResult>} Test result
 */
async function testAnthropicKey(apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok) {
      return { valid: true, error: null };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (response.status === 429) {
      return { valid: false, error: 'Rate limited - key may be valid but quota exceeded' };
    }
    
    return { valid: false, error: errorMessage };
  } catch (error) {
    return { valid: false, error: `Network error: ${error.message}` };
  }
}

/**
 * Test a Gemini API key by listing models
 * 
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<KeyTestResult>} Test result
 */
async function testGeminiKey(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (response.ok) {
      return { valid: true, error: null };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    
    if (response.status === 400 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (response.status === 429) {
      return { valid: false, error: 'Rate limited - key may be valid but quota exceeded' };
    }
    
    return { valid: false, error: errorMessage };
  } catch (error) {
    return { valid: false, error: `Network error: ${error.message}` };
  }
}

/**
 * Test an API key for any supported provider
 * 
 * @param {'openai' | 'anthropic' | 'gemini'} provider - Provider name
 * @param {string} apiKey - API key to test
 * @returns {Promise<KeyTestResult>} Test result
 */
export async function testApiKey(provider, apiKey) {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  switch (provider) {
    case 'openai':
      return testOpenAIKey(apiKey);
    case 'anthropic':
      return testAnthropicKey(apiKey);
    case 'gemini':
      return testGeminiKey(apiKey);
    default:
      return { valid: false, error: `Unknown provider: ${provider}` };
  }
}

/**
 * Test all provided API keys
 * 
 * @param {Object} apiKeys - Object with provider keys
 * @param {string} [apiKeys.openai] - OpenAI API key
 * @param {string} [apiKeys.anthropic] - Anthropic API key
 * @param {string} [apiKeys.gemini] - Gemini API key
 * @returns {Promise<Object>} Results keyed by provider
 */
export async function testAllKeys(apiKeys) {
  const results = {};
  const providers = ['openai', 'anthropic', 'gemini'];
  
  await Promise.all(
    providers.map(async (provider) => {
      if (apiKeys[provider]) {
        results[provider] = await testApiKey(provider, apiKeys[provider]);
      } else {
        results[provider] = { valid: false, error: 'No key provided' };
      }
    })
  );
  
  return results;
}

/**
 * Get key status label for display
 * 
 * @param {KeyTestResult} result - Test result
 * @returns {'valid' | 'invalid' | 'untested'} Status label
 */
export function getKeyStatus(result) {
  if (!result) return 'untested';
  return result.valid ? 'valid' : 'invalid';
}

/**
 * Mask an API key for display (show first 4 and last 4 characters)
 * 
 * @param {string} key - API key to mask
 * @returns {string} Masked key
 */
export function maskApiKey(key) {
  if (!key || key.length < 12) return '****';
  return `${key.slice(0, 8)}${'*'.repeat(Math.max(0, key.length - 12))}${key.slice(-4)}`;
}
