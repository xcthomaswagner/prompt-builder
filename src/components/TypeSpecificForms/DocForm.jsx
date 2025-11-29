/**
 * Doc-specific form fields
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { FormField, ButtonGroup, Checkbox, Select, MultiSelect } from '../ui/FormField.jsx';
import { SECTION_STRUCTURES } from '../../lib/promptSpecs/templates/doc.js';

const DOCUMENT_TYPES = [
  { value: 'requirements', label: 'Requirements' },
  { value: 'guide', label: 'Guide' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'proposal', label: 'Proposal' },
];

const CITATION_STYLES = [
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'ieee', label: 'IEEE' },
];

export default function DocForm({ spec, onChange, darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
      >
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          <FileText className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          Document Settings
        </div>
        {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Document Type - Full Width */}
          <FormField label="Document Type" darkMode={darkMode}>
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
              darkMode={darkMode}
            />
          </FormField>

          {/* Two Column Layout - Sections | Settings & Options */}
          {suggestedSections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Sections */}
              <div className={`rounded-lg p-4 border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <FormField 
                  label="Sections" 
                  hint="Select which sections to include"
                  darkMode={darkMode}
                >
                  <MultiSelect
                    options={suggestedSections.map(s => ({
                      value: s,
                      label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    }))}
                    value={typeSpecific.section_structure || []}
                    onChange={(v) => handleChange('section_structure', v)}
                    darkMode={darkMode}
                  />
                </FormField>
              </div>

              {/* Right Column - Settings & Options */}
              <div className={`rounded-lg p-4 border space-y-4 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <h5 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Settings & Options</h5>
                
                {/* Toggles */}
                <div className="space-y-2">
                  <Checkbox
                    label="Include Executive Summary"
                    checked={typeSpecific.include_executive_summary || false}
                    onChange={(v) => handleChange('include_executive_summary', v)}
                    darkMode={darkMode}
                  />
                  <Checkbox
                    label="Include Table of Contents"
                    checked={typeSpecific.include_toc || false}
                    onChange={(v) => handleChange('include_toc', v)}
                    darkMode={darkMode}
                  />
                </div>

                {/* Citation Style */}
                <FormField label="Citation Style" hint="If references are needed" darkMode={darkMode}>
                  <Select
                    value={typeSpecific.citation_style}
                    onChange={(v) => handleChange('citation_style', v)}
                    options={CITATION_STYLES}
                    placeholder="None"
                    darkMode={darkMode}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* Fallback when no sections - show settings inline */}
          {suggestedSections.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-lg p-4 border space-y-4 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <h5 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Settings & Options</h5>
                <div className="space-y-2">
                  <Checkbox
                    label="Include Executive Summary"
                    checked={typeSpecific.include_executive_summary || false}
                    onChange={(v) => handleChange('include_executive_summary', v)}
                    darkMode={darkMode}
                  />
                  <Checkbox
                    label="Include Table of Contents"
                    checked={typeSpecific.include_toc || false}
                    onChange={(v) => handleChange('include_toc', v)}
                    darkMode={darkMode}
                  />
                </div>
                <FormField label="Citation Style" hint="If references are needed" darkMode={darkMode}>
                  <Select
                    value={typeSpecific.citation_style}
                    onChange={(v) => handleChange('citation_style', v)}
                    options={CITATION_STYLES}
                    placeholder="None"
                    darkMode={darkMode}
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
