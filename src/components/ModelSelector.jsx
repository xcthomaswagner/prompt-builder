import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_MODELS, getModelsByProvider } from '../lib/llmService';

/**
 * ModelSelector – dropdown for selecting an LLM model.
 * 
 * @param {Object} props
 * @param {string} props.label - Label for the selector
 * @param {string} props.value - Currently selected model ID
 * @param {Function} props.onChange - Callback when selection changes
 * @param {boolean} [props.disabled] - Whether the selector is disabled
 * @param {string} [props.className] - Additional CSS classes
 */
export default function ModelSelector({ label, value, onChange, disabled = false, className = '' }) {
  const modelsByProvider = getModelsByProvider();
  const providerLabels = {
    google: 'Google',
    openai: 'OpenAI',
    anthropic: 'Anthropic'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <optgroup key={provider} label={providerLabels[provider] || provider}>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
