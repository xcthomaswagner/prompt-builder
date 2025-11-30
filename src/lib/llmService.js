/**
 * llmService.js – Unified LLM service for multi-model support.
 * 
 * Provides a consistent interface for calling different LLM providers
 * (Gemini, OpenAI, Anthropic) with automatic model routing.
 */

// Default max output tokens
export const MAX_OUTPUT_TOKENS = 4096;

// Request timeout in milliseconds (30 seconds)
const REQUEST_TIMEOUT_MS = 30000;

// Retry delays for transient errors (exponential backoff)
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Model lists per provider - for UI dropdowns
 */
export const OPENAI_MODELS = [
  { id: 'gpt-5.1', label: 'GPT-5.1', description: 'Latest flagship' },
  { id: 'gpt-4.5-preview', label: 'GPT-4.5', description: 'Large-scale agentic model' },
  { id: 'o3', label: 'o3', description: 'Reasoning model' },
];

export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Latest balanced model' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: 'Fastest Claude' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Latest fast model' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Advanced reasoning' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Quick responses' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', description: 'Lightweight' },
];

/**
 * Unified model list with provider info
 */
export const SUPPORTED_MODELS = [
  // Google Gemini
  ...GEMINI_MODELS.map(m => ({ ...m, provider: 'google' })),
  // OpenAI
  ...OPENAI_MODELS.map(m => ({ ...m, provider: 'openai' })),
  // Anthropic
  ...CLAUDE_MODELS.map(m => ({ ...m, provider: 'anthropic' })),
];


/**
 * Get models grouped by provider for UI display.
 */
export function getModelsByProvider() {
  const grouped = {};
  for (const model of SUPPORTED_MODELS) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }
  return grouped;
}

/**
 * Get a model by its ID.
 */
export function getModelById(modelId) {
  return SUPPORTED_MODELS.find(m => m.id === modelId);
}

/**
 * JSON response schema for structured prompt generation responses.
 * Used by Gemini's structured output feature.
 */
const PROMPT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["analysis", "reverse_prompting", "final_output"],
  properties: {
    analysis: {
      type: "OBJECT",
      required: ["detected_domain", "input_quality_score", "is_vague_or_short"],
      properties: {
        detected_domain: { type: "STRING" },
        input_quality_score: { type: "INTEGER" },
        is_vague_or_short: { type: "BOOLEAN" }
      }
    },
    reverse_prompting: {
      type: "OBJECT",
      required: ["was_triggered", "refined_task_text", "reasoning"],
      properties: {
        was_triggered: { type: "BOOLEAN" },
        refined_task_text: { type: "STRING" },
        reasoning: { type: "STRING" }
      }
    },
    final_output: {
      type: "OBJECT",
      required: ["expanded_prompt_text", "enrichment_attributes_used"],
      properties: {
        expanded_prompt_text: { type: "STRING" },
        enrichment_attributes_used: { type: "ARRAY", items: { type: "STRING" } }
      }
    }
  }
};

/**
 * Call Gemini API with structured JSON output.
 * Includes retry logic for transient errors.
 * 
 * @param {string} userPrompt - The user's prompt
 * @param {string} systemPrompt - System instruction
 * @param {string} apiKey - Gemini API key
 * @param {string} modelId - Model ID (default: gemini-2.0-flash)
 * @param {Object} options - Additional options
 * @param {boolean} options.jsonMode - Whether to use structured JSON output (default: true)
 * @returns {Promise<Object|string>} - Parsed JSON response or text
 */
export async function callGemini(userPrompt, systemPrompt, apiKey, modelId = 'gemini-2.0-flash', options = {}) {
  const { jsonMode = true } = options;
  
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const generationConfig = {
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  };

  // Add JSON schema for structured output
  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = PROMPT_RESPONSE_SCHEMA;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig
  };

  let attempts = 0;

  while (attempts <= 5) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error Response:", errorText);

        if (response.status === 503) {
          throw new Error("Gemini API is temporarily unavailable (503). Please try again in a few moments.");
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (response.status === 400) {
          throw new Error("Invalid request to Gemini API. Please check your input.");
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response text from Gemini');
      }

      return jsonMode ? JSON.parse(text) : text;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error("Request timed out after 30 seconds. Please try again.");
      }

      // For 503 errors, only retry twice
      if (error.message?.includes("503") || error.message?.includes("unavailable")) {
        attempts++;
        if (attempts > 2) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempts - 1]));
        continue;
      }

      attempts++;
      if (attempts > 5) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempts - 1]));
    }
  }
}

/**
 * Simple text-only Gemini call (no JSON schema).
 * Useful for improvement/refinement requests.
 */
export async function callGeminiText(userPrompt, systemPrompt, apiKey, modelId = 'gemini-2.0-flash') {
  return callGemini(userPrompt, systemPrompt, apiKey, modelId, { jsonMode: false });
}

/**
 * Call OpenAI API with JSON response format.
 * 
 * @param {string} userPrompt - The user's prompt
 * @param {string} systemPrompt - System instruction
 * @param {string} apiKey - OpenAI API key
 * @param {string} modelId - Model ID (default: gpt-5.1)
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function callOpenAI(userPrompt, systemPrompt, apiKey, modelId = 'gpt-5.1') {
  if (!apiKey) throw new Error("OpenAI API Key is missing");

  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: (systemPrompt || '') + "\n\nIMPORTANT: You must return valid JSON only." },
    { role: 'user', content: userPrompt }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('No response text from OpenAI');
    }

    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('OpenAI request timed out');
    }
    console.error("[OpenAI API Error]", err.message || err);
    throw new Error(`OpenAI call failed: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Call Anthropic API with JSON response.
 * Supports optional Firebase Function proxy to avoid Cloudflare issues.
 * 
 * @param {string} userPrompt - The user's prompt
 * @param {string} systemPrompt - System instruction
 * @param {string} apiKey - Anthropic API key
 * @param {string} modelId - Model ID (default: claude-3-5-sonnet-20241022)
 * @param {string} [proxyUrl] - Optional Firebase Function proxy URL
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function callAnthropic(userPrompt, systemPrompt, apiKey, modelId = 'claude-3-5-sonnet-20241022', proxyUrl = null) {
  // Use Firebase Function proxy if available (avoids Cloudflare)
  if (proxyUrl) {
    try {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, systemInstruction: systemPrompt, modelId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude Function Error: ${errorData.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[Claude Function Error]", error.message || error);
      throw new Error(`Claude function call failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Direct API call
  if (!apiKey) throw new Error("Claude API Key is missing");

  const url = 'https://api.anthropic.com/v1/messages';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: (systemPrompt || '') + "\n\nIMPORTANT: You must return valid JSON only.",
        messages: [{ role: 'user', content: userPrompt }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      throw new Error('No response text from Anthropic');
    }

    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Anthropic request timed out');
    }
    console.error("[Anthropic API Error]", err.message || err);
    throw new Error(`Anthropic call failed: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Unified model caller – routes to the appropriate provider based on model ID.
 * Supports optional file attachments for multimodal models.
 * 
 * @param {string} modelId - The model ID (e.g., 'gpt-4o', 'gemini-2.0-flash')
 * @param {string} userPrompt - The user's prompt
 * @param {string} systemPrompt - Optional system prompt
 * @param {Object} apiKeys - Object containing API keys { gemini, openai, anthropic }
 * @param {Array} [fileAttachments] - Optional array of file attachments for vision models
 *   Each attachment: { url, fileName, contentType, score }
 * @returns {Promise<string>} - The model's response text
 */
export async function callModel(modelId, userPrompt, systemPrompt, apiKeys, fileAttachments = []) {
  const model = getModelById(modelId);
  
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // Note: File attachments are not yet implemented.
  // Full multimodal support requires fetching file content and formatting for each provider.
  // For now, we proceed with text-only calls.

  switch (model.provider) {
    case 'google':
      if (!apiKeys.gemini) throw new Error('Gemini API key is required');
      return callGemini(userPrompt, systemPrompt, apiKeys.gemini, modelId);
    
    case 'openai':
      if (!apiKeys.openai) throw new Error('OpenAI API key is required');
      return callOpenAI(userPrompt, systemPrompt, apiKeys.openai, modelId);
    
    case 'anthropic':
      if (!apiKeys.anthropic) throw new Error('Anthropic API key is required');
      return callAnthropic(userPrompt, systemPrompt, apiKeys.anthropic, modelId);
    
    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}

/**
 * Parse JSON from LLM response, handling markdown code blocks.
 */
export function parseJsonResponse(text) {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}`);
  }
}

/**
 * Extract the expanded prompt text from an LLM response.
 * Handles various response formats and nested structures.
 * 
 * @param {Object|string} response - The LLM response object or string
 * @returns {string} - The extracted prompt text
 */
export function extractExpandedPrompt(response) {
  if (!response) return '';
  if (typeof response === 'string') {
    return response.trim();
  }

  const readPath = (obj, path) => {
    let current = obj;
    for (const segment of path) {
      if (current == null) return '';
      current = current[segment];
    }
    if (typeof current === 'string') {
      return current.trim();
    }
    if (current && typeof current === 'object') {
      try {
        return JSON.stringify(current);
      } catch (err) {
        return '';
      }
    }
    return '';
  };

  const candidatePaths = [
    ['final_output', 'expanded_prompt_text'],
    ['final_output', 'expandedPromptText'],
    ['final_output', 'expanded_prompt', 'text'],
    ['final_output', 'expandedPrompt', 'text'],
    ['final_output', 'expanded_prompt'],
    ['final_output', 'expandedPrompt'],
    ['final_output', 'text'],
    ['final_output', 'prompt'],
    ['expanded_prompt_text'],
    ['expandedPromptText'],
    ['expanded_prompt'],
    ['expandedPrompt'],
    ['finalPrompt'],
    ['final_prompt_text'],
    ['final_prompt']
  ];

  for (const path of candidatePaths) {
    const value = readPath(response, path);
    if (value) return value;
  }

  const finalOutput = response.final_output;
  if (typeof finalOutput === 'string') {
    return finalOutput.trim();
  }

  if (finalOutput && typeof finalOutput === 'object') {
    try {
      const serialized = JSON.stringify(finalOutput);
      if (serialized) return serialized;
    } catch (err) {
      console.warn('Failed to stringify final_output', err);
    }
  }

  try {
    const serialized = JSON.stringify(response);
    return serialized || '';
  } catch (err) {
    console.warn('Failed to stringify AI response', err);
    return '';
  }
}
