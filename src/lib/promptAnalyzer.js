/**
 * Prompt Analyzer - Infers content types from user input text
 * 
 * Priority:
 * 1. Explicit UI selections (typeSpecific values)
 * 2. Inferred from prompt text analysis
 * 3. Default fallbacks
 */

// Pattern definitions for detecting content types
const TYPE_PATTERNS = {
  // Output type detection (doc, deck, data, code, copy, comms)
  outputType: [
    { pattern: /\b(presentation|slide[s]?|deck|pitch)\b/i, value: 'deck' },
    { pattern: /\b(api|schema|database|data\s*dictionary|dashboard|analytics\s*report)\b/i, value: 'data' },
    { pattern: /\b(code|function|class|module|bug\s*fix|refactor|migration|endpoint)\b/i, value: 'code' },
    { pattern: /\b(press\s*release|ad\s*copy|landing\s*page|tagline|product\s*description|email\s*campaign|social\s*media\s*post)\b/i, value: 'copy' },
    { pattern: /\b(email|memo|announcement|update|brief|feedback|1:1|one-on-one)\b/i, value: 'comms' },
    { pattern: /\b(document|doc|spec|specification|report|guide|manual|proposal)\b/i, value: 'doc' }
  ],

  // Deck type detection
  deck_type: [
    { pattern: /\b(investor|pitch|funding|series\s*[a-z]|seed|venture|vc)\b/i, value: 'investor' },
    { pattern: /\b(sales|prospect|client|customer\s*pitch|deal)\b/i, value: 'sales' },
    { pattern: /\b(board|quarterly|q[1-4]|directors|governance)\b/i, value: 'board' },
    { pattern: /\b(internal|team\s*meeting|stakeholder|decision)\b/i, value: 'internal' },
    { pattern: /\b(training|workshop|onboarding|learning|course)\b/i, value: 'training' }
  ],

  // Data type detection
  data_type: [
    { pattern: /\b(api|rest|graphql|endpoint|swagger|openapi)\b/i, value: 'api' },
    { pattern: /\b(schema|database|table|entity|erd|sql|nosql|postgres|mysql|mongo)\b/i, value: 'schema' },
    { pattern: /\b(data\s*dictionary|field\s*definition|column\s*definition|metadata)\b/i, value: 'dictionary' },
    { pattern: /\b(analytics|report|findings|metrics|kpi|analysis)\b/i, value: 'analytics' },
    { pattern: /\b(dashboard|visualization|tableau|looker|powerbi|chart)\b/i, value: 'dashboard' }
  ],

  // Code type detection
  code_type: [
    { pattern: /\b(feature|user\s*story|requirement|spec|specification|functional|prd)\b/i, value: 'feature' },
    { pattern: /\b(bug|fix|issue|defect|error|broken|regression)\b/i, value: 'bugfix' },
    { pattern: /\b(refactor|cleanup|technical\s*debt|modernize|restructure)\b/i, value: 'refactor' },
    { pattern: /\b(api|endpoint|route|controller|service\s*layer)\b/i, value: 'api' },
    { pattern: /\b(migration|migrate|upgrade|schema\s*change|data\s*migration)\b/i, value: 'migration' }
  ],

  // Copy type detection
  copy_type: [
    { pattern: /\b(press\s*release|pr|media\s*release|news\s*release)\b/i, value: 'press' },
    { pattern: /\b(email|newsletter|drip|campaign|nurture)\b/i, value: 'email' },
    { pattern: /\b(ad|advertisement|paid|ppc|facebook\s*ad|google\s*ad|linkedin\s*ad)\b/i, value: 'ad' },
    { pattern: /\b(landing\s*page|lp|conversion|signup|lead\s*gen)\b/i, value: 'landing' },
    { pattern: /\b(social|twitter|linkedin\s*post|instagram|facebook\s*post|thread)\b/i, value: 'social' },
    { pattern: /\b(product\s*description|pdp|listing|amazon|shopify|ecommerce)\b/i, value: 'product' },
    { pattern: /\b(tagline|slogan|headline|hook|catchphrase)\b/i, value: 'tagline' }
  ],

  // Comms type detection
  comms_type: [
    { pattern: /\b(exec|executive|leadership|c-suite|vp|director)\s*(update|report|summary)\b/i, value: 'exec_update' },
    { pattern: /\b(all[\s-]?hands|town\s*hall|company[\s-]?wide|org[\s-]?wide)\b/i, value: 'allhands' },
    { pattern: /\b(1:1|one[\s-]?on[\s-]?one|1-on-1|check[\s-]?in|direct\s*report)\b/i, value: 'oneone' },
    { pattern: /\b(stakeholder|brief|decision\s*maker|sponsor|executive\s*brief)\b/i, value: 'stakeholder' },
    { pattern: /\b(announce|announcement|news|launch|rollout|introduce)\b/i, value: 'announcement' },
    { pattern: /\b(feedback|performance|review|constructive|improvement)\b/i, value: 'feedback' }
  ],

  // Emotional appeal detection for copy
  emotional_appeal: [
    { pattern: /\b(fear|fomo|miss\s*out|urgent|scarcity|limited|deadline)\b/i, value: 'fear' },
    { pattern: /\b(aspiration|dream|achieve|success|potential|transform)\b/i, value: 'aspiration' },
    { pattern: /\b(trust|credibility|proof|testimonial|case\s*study|evidence)\b/i, value: 'trust' },
    { pattern: /\b(belong|community|tribe|together|join|part\s*of)\b/i, value: 'belonging' },
    { pattern: /\b(curiosity|discover|secret|reveal|learn|find\s*out)\b/i, value: 'curiosity' }
  ],

  // CTA type detection for copy
  cta_type: [
    { pattern: /\b(buy|purchase|order|checkout|shop)\b/i, value: 'purchase' },
    { pattern: /\b(sign[\s-]?up|register|subscribe|join)\b/i, value: 'signup' },
    { pattern: /\b(learn\s*more|read\s*more|discover|explore)\b/i, value: 'learn' },
    { pattern: /\b(contact|get\s*in\s*touch|reach\s*out|talk\s*to)\b/i, value: 'contact' },
    { pattern: /\b(download|get\s*the|free|ebook|whitepaper|guide)\b/i, value: 'download' },
    { pattern: /\b(book|schedule|demo|consultation|call)\b/i, value: 'book' }
  ]
};

/**
 * Analyzes prompt text and returns inferred type values
 * @param {string} promptText - The user's input text
 * @returns {object} - Inferred types with confidence scores
 */
export const analyzePrompt = (promptText) => {
  if (!promptText || typeof promptText !== 'string') {
    return { inferred: {}, confidence: {} };
  }

  const text = promptText.toLowerCase();
  const inferred = {};
  const confidence = {};

  Object.entries(TYPE_PATTERNS).forEach(([typeKey, patterns]) => {
    let bestMatch = null;
    let bestScore = 0;

    patterns.forEach(({ pattern, value }) => {
      const matches = text.match(pattern);
      if (matches) {
        // Score based on match position (earlier = higher) and match count
        const position = text.indexOf(matches[0]);
        const positionScore = Math.max(0, 1 - (position / text.length));
        const matchCount = (text.match(new RegExp(pattern, 'gi')) || []).length;
        const score = positionScore + (matchCount * 0.2);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = value;
        }
      }
    });

    if (bestMatch) {
      inferred[typeKey] = bestMatch;
      confidence[typeKey] = Math.min(1, bestScore);
    }
  });

  return { inferred, confidence };
};

/**
 * Merges explicit UI selections with inferred values
 * UI selections always take priority over inferred values
 * @param {object} explicit - Values explicitly selected by user in UI
 * @param {object} inferred - Values inferred from prompt analysis
 * @returns {object} - Merged result with source tracking
 */
export const mergeWithInferred = (explicit = {}, inferred = {}) => {
  const merged = { ...inferred };
  const sources = {};

  // Track sources for all inferred values
  Object.keys(inferred).forEach(key => {
    sources[key] = 'inferred';
  });

  // Override with explicit values where present
  Object.entries(explicit).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      merged[key] = value;
      sources[key] = 'explicit';
    }
  });

  return { values: merged, sources };
};

/**
 * Returns a formatted string indicating which fields were inferred vs explicit
 * This can be included in the prompt to help users understand what was auto-detected
 */
export const generateInferenceReport = (sources, confidence = {}) => {
  const inferred = Object.entries(sources)
    .filter(([_, source]) => source === 'inferred')
    .map(([key, _]) => {
      const conf = confidence[key] ? ` (${Math.round(confidence[key] * 100)}% confidence)` : '';
      return `  - ${key}: auto-detected${conf}`;
    });

  if (inferred.length === 0) return '';

  return `\n[AUTO-DETECTED SETTINGS - override these by making UI selections]\n${inferred.join('\n')}`;
};

/**
 * Infers the best output type from prompt text if not explicitly selected
 */
export const inferOutputType = (promptText, currentOutputType) => {
  // If user has selected something other than default, respect it
  if (currentOutputType && currentOutputType !== 'doc') {
    return { outputType: currentOutputType, source: 'explicit' };
  }

  const { inferred } = analyzePrompt(promptText);
  
  if (inferred.outputType) {
    return { outputType: inferred.outputType, source: 'inferred' };
  }

  return { outputType: currentOutputType || 'doc', source: 'default' };
};

export default analyzePrompt;
