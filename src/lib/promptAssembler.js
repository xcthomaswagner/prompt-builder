import PROMPT_SPECS from './promptSpecs';

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
    case 'equals':
      return value === condition.value;
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
  toggles
}, specRegistry = PROMPT_SPECS) => {
  const registry = specRegistry && Object.keys(specRegistry).length ? specRegistry : PROMPT_SPECS;
  const spec = registry[specId] || registry.default || PROMPT_SPECS[specId] || PROMPT_SPECS.default;
  if (!spec) {
    throw new Error(`No prompt spec found for ${specId}`);
  }

  const context = {
    userInput: userInput?.trim() || '',
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
    spec: expandMetadataLists(spec.metadata || {})
  };

  const system = buildBlocks(spec.systemSteps || [], context);
  const user = buildBlocks(spec.userSteps || [], context);

  return {
    specId: spec.id,
    specVersion: spec.version || 1,
    systemPrompt: system.text,
    userPrompt: user.text || context.userInput,
    stepTrace: [...system.trace, ...user.trace],
    contextSnapshot: context
  };
};

export default buildPromptPlan;
