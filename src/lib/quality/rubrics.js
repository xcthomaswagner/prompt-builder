/**
 * Quality Assessment Rubrics
 * 
 * Defines scoring criteria for prompt quality evaluation.
 * 
 * @module quality/rubrics
 */

/**
 * Base rubric dimensions applicable to all prompt types
 */
export const baseRubric = {
  structure: {
    weight: 0.2,
    name: 'Structure',
    description: 'Organization and logical flow',
    criteria: [
      'Has clear organization with logical sections',
      'Information flows naturally from one part to next',
      'Hierarchy is appropriate (not too flat, not too nested)',
    ],
    scoreGuide: {
      1: 'No discernible structure',
      3: 'Basic structure but confusing flow',
      5: 'Adequate structure, some flow issues',
      7: 'Good structure, logical flow',
      9: 'Excellent structure, seamless flow',
      10: 'Perfect organization, exemplary',
    },
  },
  
  specificity: {
    weight: 0.25,
    name: 'Specificity',
    description: 'Concrete details and clarity',
    criteria: [
      'Uses concrete language rather than vague terms',
      'Includes relevant details and context',
      'Avoids generic phrases that could apply to anything',
    ],
    scoreGuide: {
      1: 'Entirely vague and generic',
      3: 'Mostly vague with few specifics',
      5: 'Mix of specific and vague',
      7: 'Mostly specific with clear details',
      9: 'Highly specific throughout',
      10: 'Exceptionally precise and detailed',
    },
  },
  
  actionability: {
    weight: 0.25,
    name: 'Actionability',
    description: 'Clear instructions and outcomes',
    criteria: [
      'Instructions are clear enough to follow without guessing',
      'Requirements are unambiguous',
      'Success criteria are measurable or observable',
    ],
    scoreGuide: {
      1: 'No clear action possible',
      3: 'Vague actions, much guessing needed',
      5: 'Some clear actions, some ambiguity',
      7: 'Clear actions with minor ambiguity',
      9: 'Very clear, actionable throughout',
      10: 'Perfectly actionable, no ambiguity',
    },
  },
  
  tone_alignment: {
    weight: 0.15,
    name: 'Tone Alignment',
    description: 'Consistency with specified tone',
    criteria: [
      'Tone is consistent throughout the prompt',
      'Matches the specified tone setting',
      'Appropriate for the target audience',
    ],
    scoreGuide: {
      1: 'Tone completely mismatched',
      3: 'Inconsistent tone throughout',
      5: 'Partially aligned tone',
      7: 'Good tone alignment',
      9: 'Excellent tone consistency',
      10: 'Perfect tone throughout',
    },
  },
  
  completeness: {
    weight: 0.15,
    name: 'Completeness',
    description: 'All required elements present',
    criteria: [
      'All required elements from the spec are present',
      'No obvious gaps or missing sections',
      'Addresses the full scope of the request',
    ],
    scoreGuide: {
      1: 'Major elements missing',
      3: 'Several important gaps',
      5: 'Some elements missing',
      7: 'Most elements present',
      9: 'All elements present',
      10: 'Complete with extras',
    },
  },
};

/**
 * Type-specific rubric extensions
 */
export const typeRubrics = {
  deck: {
    visual_guidance: {
      weight: 0.1,
      name: 'Visual Guidance',
      description: 'Quality of visual suggestions',
      criteria: [
        'Includes visual suggestions for slides',
        'Slide structure is clear and logical',
        'Speaker notes are useful and actionable',
      ],
      scoreGuide: {
        1: 'No visual guidance',
        5: 'Basic visual suggestions',
        7: 'Good visual guidance',
        10: 'Excellent visual direction',
      },
    },
  },
  
  code: {
    technical_accuracy: {
      weight: 0.2,
      name: 'Technical Accuracy',
      description: 'Correctness of technical requirements',
      criteria: [
        'Syntax expectations are correct for the language',
        'Appropriate patterns and idioms are suggested',
        'Error handling requirements are specified',
      ],
      scoreGuide: {
        1: 'Technically incorrect',
        5: 'Some technical issues',
        7: 'Technically sound',
        10: 'Technically excellent',
      },
    },
  },
  
  doc: {
    document_structure: {
      weight: 0.1,
      name: 'Document Structure',
      description: 'Appropriate document organization',
      criteria: [
        'Section structure matches document type',
        'Appropriate use of headings and hierarchy',
        'Logical flow for the document purpose',
      ],
      scoreGuide: {
        1: 'Poor document structure',
        5: 'Adequate structure',
        7: 'Good document organization',
        10: 'Excellent document structure',
      },
    },
  },
  
  copy: {
    persuasiveness: {
      weight: 0.15,
      name: 'Persuasiveness',
      description: 'Effectiveness of persuasive elements',
      criteria: [
        'Clear emotional appeal',
        'Compelling call to action',
        'Appropriate urgency and motivation',
      ],
      scoreGuide: {
        1: 'Not persuasive',
        5: 'Somewhat persuasive',
        7: 'Persuasive',
        10: 'Highly compelling',
      },
    },
  },
  
  comms: {
    appropriateness: {
      weight: 0.1,
      name: 'Channel Appropriateness',
      description: 'Fit for communication channel',
      criteria: [
        'Length appropriate for channel',
        'Formality matches context',
        'Action items are clear',
      ],
      scoreGuide: {
        1: 'Wrong for channel',
        5: 'Adequate for channel',
        7: 'Good fit for channel',
        10: 'Perfect for channel',
      },
    },
  },
  
  data: {
    data_clarity: {
      weight: 0.1,
      name: 'Data Clarity',
      description: 'Clarity of data requirements',
      criteria: [
        'Data structure is clearly defined',
        'Field types and formats are specified',
        'Relationships are clear if applicable',
      ],
      scoreGuide: {
        1: 'Unclear data requirements',
        5: 'Partially clear',
        7: 'Clear data requirements',
        10: 'Exceptionally clear',
      },
    },
  },
};

/**
 * Get the complete rubric for an output type
 * @param {string} outputType
 * @returns {Object} Combined rubric with base + type-specific dimensions
 */
export function getRubric(outputType) {
  const typeSpecific = typeRubrics[outputType] || {};
  
  // Combine base and type-specific, adjusting weights
  const combined = { ...baseRubric };
  
  if (Object.keys(typeSpecific).length > 0) {
    // Reduce base weights proportionally to make room for type-specific
    const typeWeight = Object.values(typeSpecific).reduce((sum, d) => sum + d.weight, 0);
    const baseWeight = 1 - typeWeight;
    
    Object.keys(combined).forEach(key => {
      combined[key] = {
        ...combined[key],
        weight: combined[key].weight * baseWeight,
      };
    });
    
    // Add type-specific dimensions
    Object.assign(combined, typeSpecific);
  }
  
  return combined;
}

/**
 * Calculate overall score from dimension scores
 * @param {Object} dimensionScores - { dimension: score }
 * @param {Object} rubric - The rubric to use for weights
 * @returns {number} Weighted overall score (0-100)
 */
export function calculateOverallScore(dimensionScores, rubric) {
  let totalWeight = 0;
  let weightedSum = 0;
  
  Object.entries(dimensionScores).forEach(([dimension, score]) => {
    const weight = rubric[dimension]?.weight || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  });
  
  if (totalWeight === 0) return 0;
  
  // Convert from 1-10 scale to 0-100
  return Math.round((weightedSum / totalWeight) * 10);
}

/**
 * Get score interpretation
 * @param {number} score - Overall score (0-100)
 * @returns {{ label: string, color: string, description: string }}
 */
export function interpretScore(score) {
  if (score >= 90) {
    return {
      label: 'Excellent',
      color: 'green',
      description: 'This prompt is exceptionally well-crafted',
    };
  }
  if (score >= 80) {
    return {
      label: 'Good',
      color: 'green',
      description: 'This prompt is well-crafted with minor improvements possible',
    };
  }
  if (score >= 70) {
    return {
      label: 'Solid',
      color: 'yellow',
      description: 'This prompt is functional but could be improved',
    };
  }
  if (score >= 60) {
    return {
      label: 'Fair',
      color: 'yellow',
      description: 'This prompt needs some work to be effective',
    };
  }
  return {
    label: 'Needs Work',
    color: 'red',
    description: 'This prompt requires significant improvement',
  };
}
