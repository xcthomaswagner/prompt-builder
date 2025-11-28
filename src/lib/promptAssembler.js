import PROMPT_SPECS from './promptSpecs';
import { analyzePrompt, mergeWithInferred, generateInferenceReport, inferOutputType } from './promptAnalyzer';

const getValueByPath = (obj, path) => {
  if (!path) return undefined;
  const segments = path.split('.').map(seg => seg.trim()).filter(Boolean);
  return segments.reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
};

const boolLabel = (value) => (value ? 'ENABLED' : 'DISABLED');
const formatList = (items = [], bullet = '- ') => {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map(item => `${bullet}${item}`).join('\n');
};

const evaluateCondition = (condition, context) => {
  if (!condition) return true;
  const value = getValueByPath(context, condition.field);
  const operator = condition.operator || 'truthy';
  switch (operator) {
    case '==':
    case 'equals':
      return value === condition.value;
    case '!=':
    case 'notEquals':
      return value !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value);
    case 'notIn':
      return Array.isArray(condition.value) && !condition.value.includes(value);
    case 'exists':
      return value !== undefined && value !== null && value !== '';
    case 'falsey':
      return !value;
    case 'truthy':
    default:
      return Boolean(value);
  }
};

const shouldIncludeStep = (step, context) => {
  if (!step.conditions || !step.conditions.length) return true;
  return step.conditions.every(condition => evaluateCondition(condition, context));
};

const renderTemplate = (template, context) => {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, rawPath) => {
    const path = rawPath.trim();
    const value = getValueByPath(context, path);
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (err) {
        return '';
      }
    }
    return String(value);
  });
};

const buildBlocks = (steps = [], context) => {
  const trace = [];
  const rendered = steps.map((step) => {
    const included = shouldIncludeStep(step, context);
    trace.push({ id: step.id, channel: step.channel, included });
    if (!included) return null;
    const text = renderTemplate(step.template, context).trim();
    return text ? text : null;
  }).filter(Boolean);
  return {
    text: rendered.join('\n\n'),
    trace
  };
};

const expandMetadataLists = (metadata = {}) => {
  const expanded = { ...metadata };
  Object.entries(metadata).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      expanded[`${key}List`] = formatList(value);
    }
  });
  return expanded;
};

export const buildPromptPlan = ({
  specId,
  userInput,
  tone,
  outputType,
  format,
  length,
  notes,
  toggles,
  typeSpecific // Type-specific fields from the form (e.g., copy_type, emotional_appeal)
}, specRegistry = PROMPT_SPECS) => {
  const registry = specRegistry && Object.keys(specRegistry).length ? specRegistry : PROMPT_SPECS;
  
  // Analyze the prompt text to infer types
  const promptText = userInput?.trim() || '';
  const { inferred, confidence } = analyzePrompt(promptText);
  
  // Infer output type if not explicitly set (or set to default 'doc')
  const { outputType: inferredOutputType, source: outputTypeSource } = inferOutputType(promptText, specId);
  const effectiveSpecId = outputTypeSource === 'inferred' ? inferredOutputType : specId;
  
  const spec = registry[effectiveSpecId] || registry.default || PROMPT_SPECS[effectiveSpecId] || PROMPT_SPECS.default;
  if (!spec) {
    throw new Error(`No prompt spec found for ${effectiveSpecId}`);
  }

  // Merge explicit typeSpecific selections with inferred values
  // Explicit selections always win
  const { values: mergedTypeSpecific, sources: typeSpecificSources } = mergeWithInferred(
    typeSpecific || {},
    inferred
  );

  // Generate inference report for transparency
  const inferenceReport = generateInferenceReport(typeSpecificSources, confidence);

  const context = {
    userInput: promptText,
    notes: notes?.trim() || '',
    tone: tone || {},
    output: outputType || {},
    format: format || {},
    length: length || {},
    toggles: {
      allowPlaceholders: Boolean(toggles?.allowPlaceholders),
      stripMeta: Boolean(toggles?.stripMeta),
      aestheticMode: Boolean(toggles?.aestheticMode),
      allowPlaceholdersLabel: boolLabel(toggles?.allowPlaceholders),
      stripMetaLabel: boolLabel(toggles?.stripMeta),
      aestheticModeLabel: boolLabel(toggles?.aestheticMode)
    },
    // Use merged typeSpecific (explicit + inferred)
    typeSpecific: mergedTypeSpecific,
    typeSpecificSources, // Track what was inferred vs explicit
    spec: expandMetadataLists(spec.metadata || {}),
    inference: {
      outputType: inferredOutputType,
      outputTypeSource,
      report: inferenceReport,
      confidence
    }
  };

  const system = buildBlocks(spec.systemSteps || [], context);
  const user = buildBlocks(spec.userSteps || [], context);

  // Append inference note to system prompt if anything was auto-detected
  let systemPromptWithInference = system.text;
  if (inferenceReport && !toggles?.stripMeta) {
    systemPromptWithInference += `\n\n${inferenceReport}`;
  }

  return {
    specId: spec.id,
    specVersion: spec.version || 1,
    systemPrompt: systemPromptWithInference,
    userPrompt: user.text || context.userInput,
    stepTrace: [...system.trace, ...user.trace],
    contextSnapshot: context,
    inference: {
      effectiveSpecId,
      outputTypeSource,
      inferredTypes: inferred,
      mergedTypeSpecific,
      sources: typeSpecificSources
    }
  };
};

export default buildPromptPlan;
