/**
 * Code-specific form fields
 */

import { FormField, ButtonGroup, Checkbox, Select, TextInput } from '../ui/FormField.jsx';
import { LANGUAGES, FRAMEWORKS } from '../../lib/promptSpecs/templates/code.js';

const ERROR_HANDLING_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

export default function CodeForm({ spec, onChange }) {
  const typeSpecific = spec.typeSpecific || {};

  const handleChange = (field, value) => {
    onChange('typeSpecific', {
      ...typeSpecific,
      [field]: value,
    });
  };

  // Get frameworks for selected language
  const availableFrameworks = typeSpecific.language
    ? FRAMEWORKS[typeSpecific.language.toLowerCase()] || []
    : [];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Code Settings
      </h4>

      {/* Language */}
      <FormField label="Language">
        <Select
          value={typeSpecific.language}
          onChange={(v) => {
            handleChange('language', v);
            // Clear framework if language changes
            if (v !== typeSpecific.language) {
              handleChange('framework', null);
            }
          }}
          options={LANGUAGES.map(l => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))}
          placeholder="Auto-detect from context"
        />
      </FormField>

      {/* Framework */}
      {availableFrameworks.length > 0 && (
        <FormField label="Framework" hint="Optional">
          <Select
            value={typeSpecific.framework}
            onChange={(v) => handleChange('framework', v)}
            options={availableFrameworks.map(f => ({ 
              value: f, 
              label: f.charAt(0).toUpperCase() + f.slice(1) 
            }))}
            placeholder="None / Auto"
          />
        </FormField>
      )}

      {/* Custom Framework Input (if language has no predefined frameworks) */}
      {typeSpecific.language && availableFrameworks.length === 0 && (
        <FormField label="Framework" hint="Optional - specify if needed">
          <TextInput
            value={typeSpecific.framework}
            onChange={(v) => handleChange('framework', v)}
            placeholder="e.g., Express, Django"
          />
        </FormField>
      )}

      {/* Error Handling */}
      <FormField label="Error Handling">
        <ButtonGroup
          options={ERROR_HANDLING_OPTIONS}
          value={typeSpecific.error_handling || 'standard'}
          onChange={(v) => handleChange('error_handling', v)}
        />
      </FormField>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4 pt-2">
        <Checkbox
          label="Include Tests"
          checked={typeSpecific.include_tests || false}
          onChange={(v) => handleChange('include_tests', v)}
        />
        <Checkbox
          label="Include Comments"
          checked={typeSpecific.include_comments !== false}
          onChange={(v) => handleChange('include_comments', v)}
        />
      </div>

      {/* Style Guide */}
      <FormField label="Style Guide" hint="Optional reference">
        <TextInput
          value={typeSpecific.style_guide}
          onChange={(v) => handleChange('style_guide', v)}
          placeholder="e.g., Airbnb, Google, PEP8"
        />
      </FormField>
    </div>
  );
}
