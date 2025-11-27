/**
 * Data-specific form fields
 */

import { FormField, ButtonGroup, Checkbox, TextInput } from '../ui/FormField.jsx';

const OUTPUT_FORMATS = [
  { value: 'table', label: 'Table' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
];

export default function DataForm({ spec, onChange }) {
  const typeSpecific = spec.typeSpecific || {};

  const handleChange = (field, value) => {
    onChange('typeSpecific', {
      ...typeSpecific,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Data Settings
      </h4>

      {/* Output Format */}
      <FormField label="Output Format">
        <ButtonGroup
          options={OUTPUT_FORMATS}
          value={typeSpecific.output_format || 'table'}
          onChange={(v) => handleChange('output_format', v)}
        />
      </FormField>

      {/* Schema Definition */}
      <FormField 
        label="Schema Hint" 
        hint="Describe the expected structure (optional)"
      >
        <TextInput
          value={typeSpecific.schema_hint}
          onChange={(v) => handleChange('schema_hint', v)}
          placeholder="e.g., columns: name, email, role"
        />
      </FormField>

      {/* Toggles */}
      <div className="space-y-2 pt-2">
        <Checkbox
          label="Include Headers"
          checked={typeSpecific.include_headers !== false}
          onChange={(v) => handleChange('include_headers', v)}
        />
        <Checkbox
          label="Include Field Descriptions"
          checked={typeSpecific.include_descriptions || false}
          onChange={(v) => handleChange('include_descriptions', v)}
        />
      </div>

      {/* Relationships hint */}
      {(typeSpecific.output_format === 'json' || typeSpecific.output_format === 'yaml') && (
        <FormField 
          label="Relationships" 
          hint="Describe data relationships if nested"
        >
          <TextInput
            value={typeSpecific.relationships_hint}
            onChange={(v) => handleChange('relationships_hint', v)}
            placeholder="e.g., users have many orders"
          />
        </FormField>
      )}
    </div>
  );
}
