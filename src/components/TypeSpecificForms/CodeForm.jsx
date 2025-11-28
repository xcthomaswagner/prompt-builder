/**
 * Code-specific form fields
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';
import { FormField, ButtonGroup, Checkbox, Select, TextInput } from '../ui/FormField.jsx';
import { LANGUAGES, FRAMEWORKS } from '../../lib/promptSpecs/templates/code.js';

const ERROR_HANDLING_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'comprehensive', label: 'Comprehensive' },
];

export default function CodeForm({ spec, onChange, darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
      >
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          <Code className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          Code Settings
        </div>
        {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">

          {/* Language */}
          <FormField label="Language" darkMode={darkMode}>
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
              darkMode={darkMode}
            />
          </FormField>

          {/* Framework */}
          {availableFrameworks.length > 0 && (
            <FormField label="Framework" hint="Optional" darkMode={darkMode}>
              <Select
                value={typeSpecific.framework}
                onChange={(v) => handleChange('framework', v)}
                options={availableFrameworks.map(f => ({ 
                  value: f, 
                  label: f.charAt(0).toUpperCase() + f.slice(1) 
                }))}
                placeholder="None / Auto"
                darkMode={darkMode}
              />
            </FormField>
          )}

          {/* Custom Framework Input (if language has no predefined frameworks) */}
          {typeSpecific.language && availableFrameworks.length === 0 && (
            <FormField label="Framework" hint="Optional - specify if needed" darkMode={darkMode}>
              <TextInput
                value={typeSpecific.framework}
                onChange={(v) => handleChange('framework', v)}
                placeholder="e.g., Express, Django"
                darkMode={darkMode}
              />
            </FormField>
          )}

          {/* Error Handling */}
          <FormField label="Error Handling" darkMode={darkMode}>
            <ButtonGroup
              options={ERROR_HANDLING_OPTIONS}
              value={typeSpecific.error_handling || 'standard'}
              onChange={(v) => handleChange('error_handling', v)}
              darkMode={darkMode}
            />
          </FormField>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Checkbox
              label="Include Tests"
              checked={typeSpecific.include_tests || false}
              onChange={(v) => handleChange('include_tests', v)}
              darkMode={darkMode}
            />
            <Checkbox
              label="Include Comments"
              checked={typeSpecific.include_comments !== false}
              onChange={(v) => handleChange('include_comments', v)}
              darkMode={darkMode}
            />
          </div>

          {/* Style Guide */}
          <FormField label="Style Guide" hint="Optional reference" darkMode={darkMode}>
            <TextInput
              value={typeSpecific.style_guide}
              onChange={(v) => handleChange('style_guide', v)}
              placeholder="e.g., Airbnb, Google, PEP8"
              darkMode={darkMode}
            />
          </FormField>
        </div>
      )}
    </div>
  );
}
