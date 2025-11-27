/**
 * Doc-specific form fields
 */

import { FormField, ButtonGroup, Checkbox, Select, MultiSelect } from '../ui/FormField.jsx';
import { SECTION_STRUCTURES } from '../../lib/promptSpecs/templates/doc.js';

const DOCUMENT_TYPES = [
  { value: 'report', label: 'Report' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'guide', label: 'Guide' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'memo', label: 'Memo' },
];

const CITATION_STYLES = [
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'ieee', label: 'IEEE' },
];

export default function DocForm({ spec, onChange }) {
  const typeSpecific = spec.typeSpecific || {};

  const handleChange = (field, value, additionalFields = {}) => {
    onChange('typeSpecific', {
      ...typeSpecific,
      [field]: value,
      ...additionalFields,
    });
  };

  // Get suggested sections for document type
  const suggestedSections = typeSpecific.document_type
    ? SECTION_STRUCTURES[typeSpecific.document_type] || []
    : [];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Document Settings
      </h4>

      {/* Document Type - Full Width */}
      <FormField label="Document Type">
        <ButtonGroup
          options={DOCUMENT_TYPES}
          value={typeSpecific.document_type}
          onChange={(v) => {
            // Update document_type and auto-suggest sections in one call
            const additionalFields = v && SECTION_STRUCTURES[v]
              ? { section_structure: SECTION_STRUCTURES[v] }
              : {};
            handleChange('document_type', v, additionalFields);
          }}
        />
      </FormField>

      {/* Two Column Layout - Sections | Settings & Options */}
      {suggestedSections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Sections */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <FormField 
              label="Sections" 
              hint="Select which sections to include"
            >
              <MultiSelect
                options={suggestedSections.map(s => ({
                  value: s,
                  label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                }))}
                value={typeSpecific.section_structure || []}
                onChange={(v) => handleChange('section_structure', v)}
              />
            </FormField>
          </div>

          {/* Right Column - Settings & Options */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
            <h5 className="text-sm font-medium text-slate-700">Settings & Options</h5>
            
            {/* Toggles */}
            <div className="space-y-2">
              <Checkbox
                label="Include Executive Summary"
                checked={typeSpecific.include_executive_summary || false}
                onChange={(v) => handleChange('include_executive_summary', v)}
              />
              <Checkbox
                label="Include Table of Contents"
                checked={typeSpecific.include_toc || false}
                onChange={(v) => handleChange('include_toc', v)}
              />
            </div>

            {/* Citation Style */}
            <FormField label="Citation Style" hint="If references are needed">
              <Select
                value={typeSpecific.citation_style}
                onChange={(v) => handleChange('citation_style', v)}
                options={CITATION_STYLES}
                placeholder="None"
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Fallback when no sections - show settings inline */}
      {suggestedSections.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
            <h5 className="text-sm font-medium text-slate-700">Settings & Options</h5>
            <div className="space-y-2">
              <Checkbox
                label="Include Executive Summary"
                checked={typeSpecific.include_executive_summary || false}
                onChange={(v) => handleChange('include_executive_summary', v)}
              />
              <Checkbox
                label="Include Table of Contents"
                checked={typeSpecific.include_toc || false}
                onChange={(v) => handleChange('include_toc', v)}
              />
            </div>
            <FormField label="Citation Style" hint="If references are needed">
              <Select
                value={typeSpecific.citation_style}
                onChange={(v) => handleChange('citation_style', v)}
                options={CITATION_STYLES}
                placeholder="None"
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}
