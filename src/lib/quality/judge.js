/**
 * Quality Judge
 * 
 * LLM-based quality assessment for generated prompts.
 * 
 * @module quality/judge
 */

import { getRubric, calculateOverallScore, interpretScore } from './rubrics.js';

/**
 * Quality assessment result
 * @typedef {Object} QualityResult
 * @property {number} overall_score - Overall score 0-100
 * @property {Object} interpretation - Score interpretation
 * @property {Object<string, { score: number, feedback: string }>} dimensions - Per-dimension scores
 * @property {string[]} strengths - List of strengths
 * @property {string[]} improvements - List of suggested improvements
 */

/**
 * Build the assessment prompt for the LLM
 * @param {string} expandedPrompt - The generated prompt to assess
 * @param {Object} spec - The prompt spec
 * @param {Object} rubric - The rubric to use
 * @returns {string}
 */
function buildAssessmentPrompt(expandedPrompt, spec, rubric) {
  const dimensionsList = Object.entries(rubric)
    .map(([key, dim]) => `- **${dim.name}** (${Math.round(dim.weight * 100)}%): ${dim.description}
  Criteria: ${dim.criteria.join('; ')}`)
    .join('\n');

  return `You are a prompt quality assessor. Evaluate this prompt against specific criteria.

## Generated Prompt to Evaluate
"""
${expandedPrompt}
"""

## Original Specification
- Primary Goal: ${spec.intent?.primary_goal || 'Not specified'}
- Output Type: ${spec.outputType}
- Target Audience: ${spec.audience?.primary || 'General'}
- Tone: ${spec.inferred?.tone || 'Not specified'}
- Format: ${spec.inferred?.format || 'Not specified'}

## Evaluation Dimensions
${dimensionsList}

## Your Task
Score each dimension from 1-10 and provide specific, actionable feedback.

Scoring Guide:
- 1-3: Poor - Major issues
- 4-5: Fair - Significant room for improvement
- 6-7: Good - Solid with minor issues
- 8-9: Very Good - High quality
- 10: Excellent - Exceptional

Be critical but fair. A score of 7 means "good, minor improvements possible."
A score of 9-10 means "exceptional, hard to improve."

Return a JSON object with this exact structure:
{
  "dimensions": {
    "${Object.keys(rubric)[0]}": { "score": <1-10>, "feedback": "<specific feedback>" },
    // ... for each dimension
  },
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"]
}

Return ONLY valid JSON, no markdown formatting.`;
}

/**
 * Parse the assessment response
 * @param {string|Object} response
 * @param {Object} rubric
 * @returns {Object}
 */
function parseAssessmentResponse(response, rubric) {
  try {
    let parsed;
    
    if (typeof response === 'object' && response.dimensions) {
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
      
      parsed = JSON.parse(jsonStr.trim());
    }
    
    // Validate and normalize dimension scores
    const dimensions = {};
    Object.keys(rubric).forEach(key => {
      const dim = parsed.dimensions?.[key];
      dimensions[key] = {
        score: Math.min(10, Math.max(1, dim?.score || 5)),
        feedback: dim?.feedback || 'No feedback provided',
      };
    });
    
    return {
      dimensions,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
    };
  } catch (error) {
    console.error('Failed to parse assessment response:', error);
    
    // Return neutral scores on parse failure
    const dimensions = {};
    Object.keys(rubric).forEach(key => {
      dimensions[key] = {
        score: 5,
        feedback: 'Unable to assess',
      };
    });
    
    return {
      dimensions,
      strengths: [],
      improvements: ['Assessment parsing failed - please try again'],
    };
  }
}

/**
 * Assess the quality of a generated prompt
 * @param {string} expandedPrompt - The prompt to assess
 * @param {Object} spec - The prompt spec
 * @param {Function} callLLM - Function to call the LLM
 * @param {Object} [options] - Options
 * @returns {Promise<QualityResult>}
 */
export async function assessQuality(expandedPrompt, spec, callLLM, options = {}) {
  const { temperature = 0.2 } = options;
  
  const rubric = getRubric(spec.outputType);
  const prompt = buildAssessmentPrompt(expandedPrompt, spec, rubric);
  
  const systemPrompt = `You are an expert prompt quality assessor. Your job is to critically evaluate prompts and provide specific, actionable feedback. Always return valid JSON.`;
  
  try {
    const response = await callLLM(prompt, systemPrompt);
    const parsed = parseAssessmentResponse(response, rubric);
    
    // Calculate overall score
    const dimensionScores = {};
    Object.entries(parsed.dimensions).forEach(([key, dim]) => {
      dimensionScores[key] = dim.score;
    });
    
    const overallScore = calculateOverallScore(dimensionScores, rubric);
    const interpretation = interpretScore(overallScore);
    
    return {
      overall_score: overallScore,
      interpretation,
      dimensions: parsed.dimensions,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
    };
  } catch (error) {
    console.error('Quality assessment failed:', error);
    throw new Error(`Quality assessment failed: ${error.message}`);
  }
}

/**
 * Quick quality check without full LLM assessment
 * Uses heuristics for fast feedback
 * @param {string} expandedPrompt
 * @param {Object} spec
 * @returns {Object}
 */
export function quickQualityCheck(expandedPrompt, spec) {
  const issues = [];
  const strengths = [];
  
  // Length check
  const wordCount = expandedPrompt.split(/\s+/).length;
  if (wordCount < 50) {
    issues.push('Prompt may be too short to be comprehensive');
  } else if (wordCount > 2000) {
    issues.push('Prompt may be too long - consider condensing');
  } else {
    strengths.push('Good prompt length');
  }
  
  // Structure check
  const hasHeadings = /^#+\s/m.test(expandedPrompt) || /\n\n[A-Z][^a-z]*:/m.test(expandedPrompt);
  if (hasHeadings) {
    strengths.push('Has clear structure with sections');
  } else if (wordCount > 200) {
    issues.push('Consider adding section headings for clarity');
  }
  
  // Specificity check
  const vagueTerms = ['things', 'stuff', 'etc', 'various', 'some', 'many'];
  const vagueCount = vagueTerms.filter(term => 
    expandedPrompt.toLowerCase().includes(term)
  ).length;
  if (vagueCount > 2) {
    issues.push('Contains vague terms - be more specific');
  }
  
  // Goal alignment
  if (spec.intent?.primary_goal) {
    const goalWords = spec.intent.primary_goal.toLowerCase().split(/\s+/);
    const promptLower = expandedPrompt.toLowerCase();
    const matchCount = goalWords.filter(w => w.length > 3 && promptLower.includes(w)).length;
    if (matchCount / goalWords.length < 0.3) {
      issues.push('Prompt may not fully address the stated goal');
    }
  }
  
  // Estimate score
  const baseScore = 70;
  const score = Math.max(30, Math.min(95, 
    baseScore - (issues.length * 10) + (strengths.length * 5)
  ));

  // Generate quick dimension estimates based on heuristics
  const dimensions = {
    structure: {
      score: hasHeadings ? 8 : (wordCount > 200 ? 5 : 7),
      feedback: hasHeadings 
        ? 'Good use of sections and structure' 
        : 'Consider adding section headings for clarity',
    },
    specificity: {
      score: vagueCount > 2 ? 5 : (vagueCount > 0 ? 7 : 8),
      feedback: vagueCount > 2 
        ? 'Contains vague terms that could be more specific' 
        : 'Good level of specificity',
    },
    completeness: {
      score: wordCount < 50 ? 4 : (wordCount > 2000 ? 6 : 8),
      feedback: wordCount < 50 
        ? 'May be too brief to cover all aspects' 
        : wordCount > 2000 
          ? 'Very comprehensive but consider condensing' 
          : 'Good coverage of the topic',
    },
  };
  
  return {
    overall_score: score,
    interpretation: interpretScore(score),
    dimensions,
    quick_check: true,
    strengths,
    improvements: issues,
  };
}

/**
 * Export for testing
 */
export const _internal = {
  buildAssessmentPrompt,
  parseAssessmentResponse,
};
