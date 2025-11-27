/**
 * Copy-specific form fields
 */

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

export default function CopyForm({ spec, onChange }) {
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
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Copy Settings
      </h4>

      {/* Copy Type */}
      <FormField label="Copy Type">
        <ButtonGroup
          options={COPY_TYPES}
          value={typeSpecific.copy_type}
          onChange={(v) => handleChange('copy_type', v)}
          size="sm"
        />
      </FormField>

      {/* Platform (for social) */}
      {typeSpecific.copy_type === 'social' && (
        <FormField label="Platform">
          <ButtonGroup
            options={PLATFORMS}
            value={typeSpecific.platform}
            onChange={(v) => handleChange('platform', v)}
            size="sm"
          />
        </FormField>
      )}

      {/* Emotional Appeal */}
      <FormField label="Emotional Appeal" hint="Primary emotional driver">
        <ButtonGroup
          options={EMOTIONAL_APPEALS}
          value={typeSpecific.emotional_appeal || 'aspiration'}
          onChange={(v) => handleChange('emotional_appeal', v)}
          size="sm"
        />
      </FormField>

      {/* CTA */}
      <FormField label="Call to Action">
        {ctaSuggestions.length > 0 ? (
          <Select
            value={typeSpecific.cta_type}
            onChange={(v) => handleChange('cta_type', v)}
            options={ctaSuggestions.map(c => ({ value: c, label: c }))}
            placeholder="Select or type custom..."
          />
        ) : (
          <TextInput
            value={typeSpecific.cta_type}
            onChange={(v) => handleChange('cta_type', v)}
            placeholder="e.g., Learn More, Shop Now"
          />
        )}
      </FormField>

      {/* Brand Voice */}
      <FormField label="Brand Voice" hint="Describe the brand personality">
        <TextInput
          value={typeSpecific.brand_voice}
          onChange={(v) => handleChange('brand_voice', v)}
          placeholder="e.g., friendly, professional, playful"
        />
      </FormField>
    </div>
  );
}
