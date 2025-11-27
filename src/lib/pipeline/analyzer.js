/**
 * Intent Analyzer
 * 
 * Analyzes user input to understand intent and infer optimal settings.
 * This is the first step in the split pipeline.
 * 
 * @module pipeline/analyzer
 */

import { createSpec, mergeSpec } from '../promptSpecs/index.js';

/**
 * Analysis result from the LLM
 * @typedef {Object} AnalysisResult
 * @property {Object} intent - Parsed intent
 * @property {Object} audience - Inferred audience
 * @property {Object} context - Inferred context
 * @property {Object} recommended_settings - Recommended tone/format/length with reasoning
 * @property {Object} type_specific_suggestions - Output-type-specific suggestions
 */

/**
 * Build the analysis prompt for the LLM
 * @param {Object} input - User input and settings
 * @returns {string} The analysis prompt
 */
function buildAnalysisPrompt(input) {
  const { userInput, notes, outputType } = input;
  
  return `You are analyzing a user's request to understand their true intent and recommend optimal settings.

## User Input
"${userInput}"

${notes ? `## Additional Notes\n${notes}\n` : ''}
## Selected Output Type
${outputType.label}: ${outputType.context}

## Your Task
Analyze this request deeply and return a JSON object with:

1. **intent**: What the user really wants
   - primary_goal: The core objective (be specific)
   - success_criteria: Array of 2-3 ways to measure success
   - action_desired: What should the reader do after consuming this?
   - urgency: low|normal|high|critical

2. **audience**: Who will consume this
   - primary: Description of main audience
   - expertise_level: novice|general|expert|mixed
   - relationship: subordinate|peer|superior|customer|public
   - expectations: Array of 2-3 things they expect

3. **context**: Situational information
   - setting: Where/when this will be used
   - prior_knowledge: Array of what audience already knows

4. **recommended_settings**: Your recommendations with reasoning
   - tone: The recommended tone (professional|creative|academic|casual|instructive)
   - format: The recommended format (paragraph|bullets|numbered|steps|sections|table)
   - length: short|medium|long
   - reasoning: Object with keys tone, format, length explaining WHY each choice

5. **type_specific_suggestions**: Suggestions specific to ${outputType.id}
   ${getTypeSpecificPromptHints(outputType.id)}

Return ONLY valid JSON, no markdown formatting.`;
}

/**
 * Get type-specific prompt hints for the analyzer
 * @param {string} outputType
 * @returns {string}
 */
function getTypeSpecificPromptHints(outputType) {
  const hints = {
    deck: `- slide_count: Recommended number of slides
   - duration_minutes: Suggested presentation length
   - presentation_context: keynote|internal|pitch|training
   - include_speaker_notes: boolean
   - include_visual_suggestions: boolean`,
    
    code: `- language: Programming language to use
   - framework: Framework if applicable
   - include_tests: boolean
   - error_handling: minimal|standard|comprehensive`,
    
    doc: `- document_type: report|proposal|guide|analysis|whitepaper|memo
   - section_structure: Array of recommended sections
   - include_executive_summary: boolean
   - include_toc: boolean`,
    
    data: `- output_format: table|json|csv|yaml
   - include_headers: boolean
   - include_descriptions: boolean`,
    
    copy: `- copy_type: ad|landing|email|social|press|tagline|product
   - emotional_appeal: fear|aspiration|urgency|trust|curiosity
   - cta_type: Suggested call to action
   - word_count: Target word count`,
    
    comms: `- channel: email|slack|memo|letter
   - formality_level: casual|professional|formal
   - response_urgency: low|normal|high|asap
   - action_items: Array of explicit asks`,
  };
  
  return hints[outputType] || '';
}

/**
 * Parse the LLM's analysis response
 * @param {string} response - Raw LLM response
 * @returns {AnalysisResult}
 */
function parseAnalysisResponse(response) {
  try {
    // Handle potential markdown code blocks
    let jsonStr = response;
    if (response.includes('```')) {
      const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1];
      }
    }
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
    throw new Error(`Analysis parsing failed: ${error.message}`);
  }
}

/**
 * Build a Prompt Spec from analysis results
 * @param {AnalysisResult} analysis
 * @param {Object} input - Original input
 * @returns {import('../promptSpecs/schema.js').BasePromptSpec}
 */
function buildSpecFromAnalysis(analysis, input) {
  const spec = createSpec(input.outputType.id);
  
  return mergeSpec(spec, {
    generatedAt: new Date(),
    intent: {
      primary_goal: analysis.intent?.primary_goal || input.userInput,
      success_criteria: analysis.intent?.success_criteria || [],
      action_desired: analysis.intent?.action_desired || '',
      urgency: analysis.intent?.urgency || 'normal',
    },
    audience: {
      primary: analysis.audience?.primary || '',
      expertise_level: analysis.audience?.expertise_level || 'general',
      relationship: analysis.audience?.relationship || 'neutral',
      expectations: analysis.audience?.expectations || [],
    },
    context: {
      setting: analysis.context?.setting || '',
      prior_knowledge: analysis.context?.prior_knowledge || [],
    },
    typeSpecific: analysis.type_specific_suggestions || {},
    inferred: {
      tone: analysis.recommended_settings?.tone || 'professional',
      format: analysis.recommended_settings?.format || 'paragraph',
      length: analysis.recommended_settings?.length || 'medium',
      reasoning: analysis.recommended_settings?.reasoning || {},
    },
  });
}

/**
 * Analyze user intent and produce a Prompt Spec
 * @param {Object} input - User input
 * @param {string} input.userInput - The user's raw input
 * @param {string} [input.notes] - Additional notes
 * @param {Object} input.outputType - Selected output type
 * @param {Function} callLLM - Function to call the LLM
 * @param {Object} [options] - Options
 * @returns {Promise<import('../promptSpecs/schema.js').BasePromptSpec>}
 */
export async function analyzeIntent(input, callLLM, options = {}) {
  const { temperature = 0.3 } = options;
  
  const prompt = buildAnalysisPrompt(input);
  
  const systemPrompt = `You are an expert prompt analyst. Your job is to deeply understand user requests and recommend optimal settings for prompt generation. Always return valid JSON.`;
  
  try {
    const response = await callLLM(prompt, systemPrompt);
    const analysis = parseAnalysisResponse(
      typeof response === 'string' ? response : JSON.stringify(response)
    );
    return buildSpecFromAnalysis(analysis, input);
  } catch (error) {
    console.error('Analysis failed:', error);
    // Return a basic spec on failure
    const spec = createSpec(input.outputType.id);
    return mergeSpec(spec, {
      generatedAt: new Date(),
      intent: {
        primary_goal: input.userInput,
      },
    });
  }
}

/**
 * Export for testing
 */
export const _internal = {
  buildAnalysisPrompt,
  parseAnalysisResponse,
  buildSpecFromAnalysis,
  getTypeSpecificPromptHints,
};
