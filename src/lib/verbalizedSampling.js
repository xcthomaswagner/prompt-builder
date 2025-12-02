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
 * 
 * Based on the paper's findings (Section H.4) which tested probability thresholds
 * from p=1.0 (full distribution) down to p=0.001 (extreme tail).
 * 
 * Uses a logarithmic scale since useful diversity compresses near zero.
 * 
 * Slider Position → Probability Threshold (p)
 * 0%   (Safe)     → p = 1.0   (full distribution)
 * 25%  (Balanced) → p = 0.50  (upper half excluded)
 * 50%  (Diverse)  → p = 0.10  (top 90% excluded)
 * 75%  (Creative) → p = 0.05  (top 95% excluded)
 * 100% (Wild)     → p = 0.01  (extreme tail only)
 */
export const DIVERSITY_LEVELS = {
  safe: {
    id: 'safe',
    label: 'Safe',
    sliderPosition: 0,
    description: 'Full distribution (p=1.0) - includes typical, expected responses',
    probabilityThreshold: 1.0, // Full distribution
    candidateCount: 5,
    temperature: 0.7,
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    sliderPosition: 25,
    description: 'Upper half excluded (p<0.50) - mix of typical and alternative',
    probabilityThreshold: 0.50,
    candidateCount: 5,
    temperature: 0.75,
  },
  diverse: {
    id: 'diverse',
    label: 'Diverse',
    sliderPosition: 50,
    description: 'Top 90% excluded (p<0.10) - primarily alternative approaches',
    probabilityThreshold: 0.10,
    candidateCount: 5,
    temperature: 0.8,
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    sliderPosition: 75,
    description: 'Top 95% excluded (p<0.05) - novel, unexpected angles',
    probabilityThreshold: 0.05,
    candidateCount: 5,
    temperature: 0.85,
  },
  wild: {
    id: 'wild',
    label: 'Wild',
    sliderPosition: 100,
    description: 'Extreme tail only (p<0.01) - highly unconventional options',
    probabilityThreshold: 0.01,
    candidateCount: 5,
    temperature: 0.9,
  },
};

/**
 * Get ordered array of diversity levels for slider
 */
export const DIVERSITY_LEVELS_ORDERED = [
  DIVERSITY_LEVELS.safe,
  DIVERSITY_LEVELS.balanced,
  DIVERSITY_LEVELS.diverse,
  DIVERSITY_LEVELS.creative,
  DIVERSITY_LEVELS.wild,
];

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
  const { candidateCount, probabilityThreshold, id, label } = diversityConfig;

  // Build threshold instruction based on probability threshold
  let thresholdInstruction;
  if (probabilityThreshold >= 1.0) {
    // Safe mode - full distribution
    thresholdInstruction = `Sample from the FULL distribution (p=1.0). Include both typical high-probability responses AND some lower-probability alternatives to show the range of approaches.`;
  } else if (probabilityThreshold >= 0.50) {
    // Balanced mode
    thresholdInstruction = `Sample where probability is BELOW ${probabilityThreshold} (p<${probabilityThreshold}). Exclude the single most obvious/expected response. Focus on alternatives that are still reasonable but less common.`;
  } else if (probabilityThreshold >= 0.10) {
    // Diverse mode
    thresholdInstruction = `Sample where probability is BELOW ${probabilityThreshold} (p<${probabilityThreshold}). Exclude typical responses entirely. Focus on genuinely different approaches that most wouldn't think of first.`;
  } else if (probabilityThreshold >= 0.05) {
    // Creative mode
    thresholdInstruction = `Sample where probability is BELOW ${probabilityThreshold} (p<${probabilityThreshold}). Target novel, unexpected angles. These should surprise the user with fresh perspectives they hadn't considered.`;
  } else {
    // Wild mode - extreme tail
    thresholdInstruction = `Sample from the EXTREME TAIL where probability is BELOW ${probabilityThreshold} (p<${probabilityThreshold}). Generate highly unconventional, boundary-pushing options. Be bold and experimental.`;
  }

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
    console.error('Failed to parse Verbalized Sampling response:', {
      error: error.message,
      response: typeof response === 'string' ? response.substring(0, 200) + '...' : response,
      timestamp: new Date().toISOString()
    });
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
    console.error('Verbalized Sampling generation failed:', {
      error: error.message,
      config: { diversityLevel, tone, outputType },
      timestamp: new Date().toISOString()
    });
    return {
      success: false,
      error: error.message,
      options: [],
      config: { diversityLevel, tone, outputType },
    };
  }
}
