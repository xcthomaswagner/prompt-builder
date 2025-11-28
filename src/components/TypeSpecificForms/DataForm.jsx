/**
 * Data-specific form fields
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { FormField, ButtonGroup, Checkbox, TextInput } from '../ui/FormField.jsx';

const OUTPUT_FORMATS = [
  { value: 'table', label: 'Table' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
];

export default function DataForm({ spec, onChange, darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const typeSpecific = spec.typeSpecific || {};

  const handleChange = (field, value) => {
    onChange('typeSpecific', {
      ...typeSpecific,
      [field]: value,
    });
  };

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
      >
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          <Database className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          Data Settings
        </div>
        {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Output Format */}
          <FormField label="Output Format" darkMode={darkMode}>
            <ButtonGroup
              options={OUTPUT_FORMATS}
              value={typeSpecific.output_format || 'table'}
              onChange={(v) => handleChange('output_format', v)}
              darkMode={darkMode}
            />
          </FormField>

          {/* Schema Definition */}
          <FormField 
            label="Schema Hint" 
            hint="Describe the expected structure (optional)"
            darkMode={darkMode}
          >
            <TextInput
              value={typeSpecific.schema_hint}
              onChange={(v) => handleChange('schema_hint', v)}
              placeholder="e.g., columns: name, email, role"
              darkMode={darkMode}
            />
          </FormField>

          {/* Toggles */}
          <div className="space-y-2 pt-2">
            <Checkbox
              label="Include Headers"
              checked={typeSpecific.include_headers !== false}
              onChange={(v) => handleChange('include_headers', v)}
              darkMode={darkMode}
            />
            <Checkbox
              label="Include Field Descriptions"
              checked={typeSpecific.include_descriptions || false}
              onChange={(v) => handleChange('include_descriptions', v)}
              darkMode={darkMode}
            />
          </div>

          {/* Relationships hint */}
          {(typeSpecific.output_format === 'json' || typeSpecific.output_format === 'yaml') && (
            <FormField 
              label="Relationships" 
              hint="Describe data relationships if nested"
              darkMode={darkMode}
            >
              <TextInput
                value={typeSpecific.relationships_hint}
                onChange={(v) => handleChange('relationships_hint', v)}
                placeholder="e.g., users have many orders"
                darkMode={darkMode}
              />
            </FormField>
          )}
        </div>
      )}
    </div>
  );
}
