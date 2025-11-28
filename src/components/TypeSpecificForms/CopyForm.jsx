/**
 * Copy-specific form fields
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { FormField, ButtonGroup, Select, TextInput } from '../ui/FormField.jsx';
import { CTA_SUGGESTIONS } from '../../lib/promptSpecs/templates/copy.js';

const COPY_TYPES = [
  { value: 'ad', label: 'Ad' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'press', label: 'Press Release' },
  { value: 'tagline', label: 'Tagline' },
  { value: 'product', label: 'Product' },
];

const EMOTIONAL_APPEALS = [
  { value: 'aspiration', label: 'Aspiration' },
  { value: 'trust', label: 'Trust' },
  { value: 'curiosity', label: 'Curiosity' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'exclusivity', label: 'Exclusivity' },
  { value: 'fear', label: 'Fear (FOMO)' },
];

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

export default function CopyForm({ spec, onChange, darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeSpecific = spec.typeSpecific || {};

  const handleChange = (field, value) => {
    onChange('typeSpecific', {
      ...typeSpecific,
      [field]: value,
    });
  };

  // Get CTA suggestions for copy type
  const ctaSuggestions = typeSpecific.copy_type
    ? CTA_SUGGESTIONS[typeSpecific.copy_type] || []
    : [];

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
      >
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          <Copy className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          Copy Settings (optional)
        </div>
        {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Copy Type */}
          <FormField label="Copy Type" darkMode={darkMode}>
            <ButtonGroup
              options={COPY_TYPES}
              value={typeSpecific.copy_type}
              onChange={(v) => handleChange('copy_type', v)}
              size="sm"
              darkMode={darkMode}
            />
          </FormField>

          {/* Platform (for social) */}
          {typeSpecific.copy_type === 'social' && (
            <FormField label="Platform" darkMode={darkMode}>
              <ButtonGroup
                options={PLATFORMS}
                value={typeSpecific.platform}
                onChange={(v) => handleChange('platform', v)}
                size="sm"
                darkMode={darkMode}
              />
            </FormField>
          )}

          {/* Emotional Appeal */}
          <FormField label="Emotional Appeal" hint="Primary emotional driver" darkMode={darkMode}>
            <ButtonGroup
              options={EMOTIONAL_APPEALS}
              value={typeSpecific.emotional_appeal || 'aspiration'}
              onChange={(v) => handleChange('emotional_appeal', v)}
              size="sm"
              darkMode={darkMode}
            />
          </FormField>

          {/* CTA */}
          <FormField label="Call to Action" darkMode={darkMode}>
            {ctaSuggestions.length > 0 ? (
              <Select
                value={typeSpecific.cta_type}
                onChange={(v) => handleChange('cta_type', v)}
                options={ctaSuggestions.map(c => ({ value: c, label: c }))}
                placeholder="Select or type custom..."
                darkMode={darkMode}
              />
            ) : (
              <TextInput
                value={typeSpecific.cta_type}
                onChange={(v) => handleChange('cta_type', v)}
                placeholder="e.g., Learn More, Shop Now"
                darkMode={darkMode}
              />
            )}
          </FormField>

          {/* Brand Voice */}
          <FormField label="Brand Voice" hint="Describe the brand personality" darkMode={darkMode}>
            <TextInput
              value={typeSpecific.brand_voice}
              onChange={(v) => handleChange('brand_voice', v)}
              placeholder="e.g., friendly, professional, playful"
              darkMode={darkMode}
            />
          </FormField>
        </div>
      )}
    </div>
  );
}
