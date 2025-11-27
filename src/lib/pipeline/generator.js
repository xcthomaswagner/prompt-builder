/**
 * Prompt Generator
 * 
 * Generates expanded prompts from Prompt Specs.
 * This is the second step in the split pipeline.
 * 
 * @module pipeline/generator
 */

/**
 * Generation result
 * @typedef {Object} GenerationResult
 * @property {string} expanded_prompt - The full prompt text
 * @property {string} structure_summary - Brief description of structure
 * @property {string[]} key_elements - Key elements included
 */

/**
 * Get type-specific generation instructions
 * @param {string} outputType
 * @param {Object} typeSpecific
 * @returns {string}
 */
function getTypeSpecificInstructions(outputType, typeSpecific) {
  const instructions = {
    deck: () => {
      const parts = ['For this slide deck:'];
      if (typeSpecific.slide_count) {
        parts.push(`- Target ${typeSpecific.slide_count} slides`);
      }
      if (typeSpecific.duration_minutes) {
        parts.push(`- Designed for ${typeSpecific.duration_minutes} minute presentation`);
      }
      if (typeSpecific.include_speaker_notes) {
        parts.push('- Include speaker notes for each slide');
      }
      if (typeSpecific.include_visual_suggestions) {
        parts.push('- Include visual/image suggestions for each slide');
      }
      parts.push('- Each slide should have: title, key points (3-5 bullets), visual suggestion, speaker notes');
      return parts.join('\n');
    },
    
    code: () => {
      const parts = ['For this code output:'];
      if (typeSpecific.language) {
        parts.push(`- Use ${typeSpecific.language}`);
      }
      if (typeSpecific.framework) {
        parts.push(`- Use ${typeSpecific.framework} framework`);
      }
      if (typeSpecific.include_tests) {
        parts.push('- Include test cases');
      }
      if (typeSpecific.include_comments) {
        parts.push('- Include inline comments explaining the code');
      }
      parts.push(`- Error handling level: ${typeSpecific.error_handling || 'standard'}`);
      return parts.join('\n');
    },
    
    doc: () => {
      const parts = ['For this document:'];
      if (typeSpecific.document_type) {
        parts.push(`- Document type: ${typeSpecific.document_type}`);
      }
      if (typeSpecific.section_structure?.length > 0) {
        parts.push(`- Include sections: ${typeSpecific.section_structure.join(', ')}`);
      }
      if (typeSpecific.include_executive_summary) {
        parts.push('- Include an executive summary at the beginning');
      }
      if (typeSpecific.include_toc) {
        parts.push('- Include a table of contents');
      }
      return parts.join('\n');
    },
    
    data: () => {
      const parts = ['For this data output:'];
      parts.push(`- Output format: ${typeSpecific.output_format || 'table'}`);
      if (typeSpecific.include_headers) {
        parts.push('- Include column headers');
      }
      if (typeSpecific.include_descriptions) {
        parts.push('- Include field descriptions');
      }
      return parts.join('\n');
    },
    
    copy: () => {
      const parts = ['For this marketing copy:'];
      if (typeSpecific.copy_type) {
        parts.push(`- Copy type: ${typeSpecific.copy_type}`);
      }
      if (typeSpecific.emotional_appeal) {
        parts.push(`- Primary emotional appeal: ${typeSpecific.emotional_appeal}`);
      }
      if (typeSpecific.cta_type) {
        parts.push(`- Call to action: ${typeSpecific.cta_type}`);
      }
      return parts.join('\n');
    },
    
    comms: () => {
      const parts = ['For this communication:'];
      parts.push(`- Channel: ${typeSpecific.channel || 'email'}`);
      parts.push(`- Formality: ${typeSpecific.formality_level || 'professional'}`);
      if (typeSpecific.action_items?.length > 0) {
        parts.push(`- Include action items: ${typeSpecific.action_items.join(', ')}`);
      }
      if (typeSpecific.include_greeting) {
        parts.push('- Include appropriate greeting');
      }
      if (typeSpecific.include_signature) {
        parts.push('- Include signature block');
      }
      return parts.join('\n');
    },
  };
  
  const generator = instructions[outputType];
  return generator ? generator() : '';
}

/**
 * Build the generation prompt
 * @param {import('../promptSpecs/schema.js').BasePromptSpec} spec
 * @returns {string}
 */
function buildGenerationPrompt(spec) {
  const typeInstructions = getTypeSpecificInstructions(spec.outputType, spec.typeSpecific);
  
  return `You are generating a high-quality, ready-to-use prompt based on a detailed specification.

## Primary Goal
${spec.intent.primary_goal}

## Success Criteria
${spec.intent.success_criteria?.length > 0 
  ? spec.intent.success_criteria.map(c => `- ${c}`).join('\n')
  : '- Meets the stated goal effectively'}

## Target Audience
- Primary: ${spec.audience.primary || 'General audience'}
- Expertise Level: ${spec.audience.expertise_level || 'general'}
- Expectations: ${spec.audience.expectations?.join(', ') || 'Clear, useful output'}

## Tone & Style
- Tone: ${spec.inferred.tone || 'professional'}
- Format: ${spec.inferred.format || 'paragraph'}
- Length: ${spec.constraints.length || 'medium'}

## Content Requirements
${spec.quality.must_include?.length > 0 
  ? 'Must include:\n' + spec.quality.must_include.map(i => `- ${i}`).join('\n')
  : ''}
${spec.quality.anti_patterns?.length > 0 
  ? '\nMust avoid:\n' + spec.quality.anti_patterns.map(i => `- ${i}`).join('\n')
  : ''}

${typeInstructions}

## Your Task
Generate an expanded prompt that:
1. Addresses the primary goal directly and specifically
2. Is perfectly tailored to the target audience
3. Follows the specified tone and format throughout
4. Includes all required content elements
5. Is immediately usable - no placeholders unless specifically requested

The prompt should be comprehensive enough that any capable LLM can execute it without additional context.

Return a JSON object with:
{
  "expanded_prompt": "The complete, ready-to-use prompt text",
  "structure_summary": "Brief description of how the prompt is organized",
  "key_elements": ["Array", "of", "key", "elements", "included"]
}

Return ONLY valid JSON, no markdown formatting.`;
}

/**
 * Parse the generation response
 * @param {string|Object} response
 * @returns {GenerationResult}
 */
function parseGenerationResponse(response) {
  try {
    if (typeof response === 'object' && response.expanded_prompt) {
      return response;
    }
    
    let jsonStr = typeof response === 'string' ? response : JSON.stringify(response);
    
    // Handle potential markdown code blocks
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1];
      }
    }
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('Failed to parse generation response:', error);
    // Return the raw response as the prompt if parsing fails
    return {
      expanded_prompt: typeof response === 'string' ? response : JSON.stringify(response),
      structure_summary: 'Unable to parse structure',
      key_elements: [],
    };
  }
}

/**
 * Generate an expanded prompt from a Prompt Spec
 * @param {import('../promptSpecs/schema.js').BasePromptSpec} spec - The prompt spec
 * @param {Function} callLLM - Function to call the LLM
 * @param {Object} [options] - Options
 * @returns {Promise<GenerationResult>}
 */
export async function generatePrompt(spec, callLLM, options = {}) {
  const { temperature = 0.7 } = options;
  
  const prompt = buildGenerationPrompt(spec);
  
  const systemPrompt = `You are an expert prompt engineer. Your job is to create comprehensive, high-quality prompts that any LLM can execute effectively. Always return valid JSON.`;
  
  try {
    const response = await callLLM(prompt, systemPrompt);
    return parseGenerationResponse(response);
  } catch (error) {
    console.error('Generation failed:', error);
    throw new Error(`Prompt generation failed: ${error.message}`);
  }
}

/**
 * Export for testing
 */
export const _internal = {
  buildGenerationPrompt,
  parseGenerationResponse,
  getTypeSpecificInstructions,
};
