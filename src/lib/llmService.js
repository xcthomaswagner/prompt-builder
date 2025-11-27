/**
 * llmService.js – Unified LLM service for multi-model support.
 * 
 * Provides a consistent interface for calling different LLM providers
 * (Gemini, OpenAI, Anthropic) with automatic model routing.
 */

/**
 * Supported models configuration.
 * Each model has an id, label, provider, and optional description.
 */
export const SUPPORTED_MODELS = [
  // Google Gemini
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Fast, efficient model for quick tasks'
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Advanced reasoning and long context'
  },
  // OpenAI
  {
    id: 'gpt-5.1',
    label: 'GPT-5.1',
    provider: 'openai',
    description: 'Latest flagship model with enhanced reasoning'
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable OpenAI model'
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and cost-effective'
  },
  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Balanced performance and speed'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fastest Claude model'
  }
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
 * Call Gemini API.
 */
async function callGemini(userPrompt, systemPrompt, apiKey, modelId = 'gemini-2.0-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response text from Gemini');
    }

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Gemini request timed out');
    }
    throw err;
  }
}

/**
 * Call OpenAI API.
 */
async function callOpenAI(userPrompt, systemPrompt, apiKey, modelId = 'gpt-4o') {
  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

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
        temperature: 0.7,
        // GPT-5.x models require max_completion_tokens instead of max_tokens
        ...(modelId.startsWith('gpt-5') 
          ? { max_completion_tokens: 8192 } 
          : { max_tokens: 8192 })
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

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('OpenAI request timed out');
    }
    throw err;
  }
}

/**
 * Call Anthropic API.
 */
async function callAnthropic(userPrompt, systemPrompt, apiKey, modelId = 'claude-3-5-sonnet-20241022') {
  const url = 'https://api.anthropic.com/v1/messages';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

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
        max_tokens: 8192,
        system: systemPrompt || undefined,
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

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Anthropic request timed out');
    }
    throw err;
  }
}

/**
 * Unified model caller – routes to the appropriate provider based on model ID.
 * 
 * @param {string} modelId - The model ID (e.g., 'gpt-4o', 'gemini-2.0-flash')
 * @param {string} userPrompt - The user's prompt
 * @param {string} systemPrompt - Optional system prompt
 * @param {Object} apiKeys - Object containing API keys { gemini, openai, anthropic }
 * @returns {Promise<string>} - The model's response text
 */
export async function callModel(modelId, userPrompt, systemPrompt, apiKeys) {
  const model = getModelById(modelId);
  
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }

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
