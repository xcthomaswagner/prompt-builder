/**
 * Verbalized Sampling (VS) Utilities
 * 
 * Implements the VS technique for generating diverse outputs by sampling
 * from different parts of the probability distribution.
 * 
 * Based on the paper's insight: instead of getting the single "most likely"
 * answer, VS forces the model to generate options across the distribution
 * from "typical" to "novel".
 * 
 * @module lib/verbalizedSampling
 */

/**
 * Diversity levels for Verbalized Sampling
 */
export const DIVERSITY_LEVELS = {
  low: {
    id: 'low',
    label: 'Low',
    description: 'Sample from full distribution including high-probability responses',
    probabilityThreshold: null, // No threshold - include typical responses
    candidateCount: 5,
    temperature: 0.7,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced mix of typical and novel responses',
    probabilityThreshold: 0.25,
    candidateCount: 5,
    temperature: 0.8,
  },
  high: {
    id: 'high',
    label: 'High',
    description: 'Sample from tails - ensure novelty with low-probability responses',
    probabilityThreshold: 0.15,
    candidateCount: 5,
    temperature: 0.9,
  },
};

/**
 * Labels for option cards based on probability
 */
export const OPTION_LABELS = {
  high: { label: 'Safe Bet', description: 'Standard approach most would expect', color: 'green' },
  medium: { label: 'Alternative Angle', description: 'Different but reasonable approach', color: 'yellow' },
  low: { label: 'Creative / Out of Box', description: 'Novel framing from the distribution tail', color: 'purple' },
};

/**
 * Get label info for a given probability
 * @param {number} probability - Probability score (0-1)
 * @returns {Object} Label info
 */
export function getOptionLabel(probability) {
  if (probability >= 0.3) return OPTION_LABELS.high;
  if (probability >= 0.15) return OPTION_LABELS.medium;
  return OPTION_LABELS.low;
}

/**
 * Build the VS system prompt
 * @param {string} tone - Tone setting (e.g., 'professional', 'friendly')
 * @param {string} outputType - Output type (e.g., 'doc', 'deck')
 * @returns {string} System prompt
 */
export function buildVSSystemPrompt(tone, outputType) {
  const outputTypeDescriptions = {
    doc: 'document or written content',
    deck: 'presentation or deck',
    data: 'data analysis or research',
    code: 'technical documentation or code',
    copy: 'marketing or creative copy',
    comms: 'business communication',
  };

  const outputDesc = outputTypeDescriptions[outputType] || 'content';

  return `You are an expert content creator specializing in ${outputDesc}. 
Adopt a ${tone} tone in all responses.
Your task is to generate multiple distinct variations that explore different approaches to the same request.
Be creative and ensure each variation takes a genuinely different angle or framing.`;
}

/**
 * Build the VS user prompt that wraps the original prompt
 * @param {string} userPrompt - The original user prompt
 * @param {Object} diversityConfig - Diversity configuration
 * @param {number} diversityConfig.candidateCount - Number of options to generate
 * @param {number|null} diversityConfig.probabilityThreshold - Max probability for novelty (null = include typical)
 * @param {string} diversityConfig.id - Diversity level ID
 * @returns {string} Wrapped prompt
 */
export function buildVSUserPrompt(userPrompt, diversityConfig) {
  const { candidateCount, probabilityThreshold, id } = diversityConfig;

  const thresholdInstruction = probabilityThreshold
    ? `Ensure novelty by making each response represent a probability below ${probabilityThreshold} in the distribution of possible answers. Avoid the most "obvious" or "expected" response.`
    : `Include both typical (high-probability) and novel (low-probability) responses to show the full range of approaches.`;

  return `Generate ${candidateCount} distinct variations of a response to this prompt:

---
${userPrompt}
---

REQUIREMENTS:
1. Return the output in strict JSON format.
2. Each option must include:
   - "text": The complete response text
   - "probability": A score from 0.0 to 1.0 indicating how "typical" vs "novel" this response is (1.0 = most expected answer, 0.0 = highly unusual)
   - "reasoning": A brief explanation of the approach or angle taken
   - "approach": A 2-4 word label for the approach (e.g., "ROI Focus", "Emotional Appeal", "Technical Deep-Dive")
3. ${thresholdInstruction}
4. Each variation should take a genuinely DIFFERENT approach - not just rephrasing the same idea.
5. Consider varying: framing, structure, emphasis, examples used, call-to-action style, etc.

JSON SCHEMA:
{
  "options": [
    {
      "text": "...",
      "probability": 0.XX,
      "reasoning": "...",
      "approach": "..."
    }
  ]
}

Return ONLY valid JSON, no markdown code blocks or additional text.`;
}

/**
 * Parse VS response from LLM
 * @param {string|Object} response - LLM response
 * @returns {Object} Parsed options
 */
export function parseVSResponse(response) {
  try {
    let parsed;

    if (typeof response === 'object' && response.options) {
      parsed = response;
    } else {
      let jsonStr = typeof response === 'string' ? response : JSON.stringify(response);

      // Handle potential markdown code blocks
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      // Try to extract JSON from response text
      const jsonMatch = jsonStr.match(/\{[\s\S]*"options"[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      parsed = JSON.parse(jsonStr.trim());
    }

    // Validate and normalize options
    if (!parsed.options || !Array.isArray(parsed.options)) {
      throw new Error('Response missing options array');
    }

    const options = parsed.options.map((opt, idx) => ({
      id: idx + 1,
      text: opt.text || '',
      probability: Math.min(1, Math.max(0, opt.probability || 0.5)),
      reasoning: opt.reasoning || 'No reasoning provided',
      approach: opt.approach || `Option ${idx + 1}`,
      label: getOptionLabel(opt.probability || 0.5),
    }));

    // Sort by probability (highest first)
    options.sort((a, b) => b.probability - a.probability);

    return {
      success: true,
      options,
    };
  } catch (error) {
    console.error('Failed to parse VS response:', error);
    return {
      success: false,
      error: error.message,
      options: [],
    };
  }
}

/**
 * Run Verbalized Sampling
 * @param {Object} params
 * @param {string} params.prompt - Original user prompt
 * @param {string} params.tone - Tone setting
 * @param {string} params.outputType - Output type
 * @param {string} params.diversityLevel - Diversity level ID
 * @param {Function} params.callLLM - LLM call function
 * @returns {Promise<Object>} VS results
 */
export async function runVerbalizedSampling({ prompt, tone, outputType, diversityLevel, callLLM }) {
  const config = DIVERSITY_LEVELS[diversityLevel] || DIVERSITY_LEVELS.medium;

  const systemPrompt = buildVSSystemPrompt(tone, outputType);
  const userPrompt = buildVSUserPrompt(prompt, config);

  try {
    const response = await callLLM(userPrompt, systemPrompt);
    const parsed = parseVSResponse(response);

    if (!parsed.success) {
      throw new Error(parsed.error);
    }

    return {
      success: true,
      options: parsed.options,
      config: {
        diversityLevel,
        tone,
        outputType,
        candidateCount: config.candidateCount,
      },
    };
  } catch (error) {
    console.error('Verbalized Sampling failed:', error);
    return {
      success: false,
      error: error.message,
      options: [],
      config: { diversityLevel, tone, outputType },
    };
  }
}
