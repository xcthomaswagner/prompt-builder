/**
 * Deck-specific form fields
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Layout } from 'lucide-react';
import { FormField, ButtonGroup, Checkbox, NumberInput, Select } from '../ui/FormField.jsx';

const DECK_TYPES = [
  { value: 'investor', label: 'Investor Pitch' },
  { value: 'sales', label: 'Sales' },
  { value: 'board', label: 'Board Update' },
  { value: 'internal', label: 'Internal' },
  { value: 'training', label: 'Training' },
];

const VISUAL_STYLES = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'data-heavy', label: 'Data Heavy' },
  { value: 'image-rich', label: 'Image Rich' },
];

export default function DeckForm({ spec, onChange, darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
          <Layout className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          Deck Settings
        </div>
        {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Deck Type */}
          <FormField label="Deck Type" hint="What type of presentation?" darkMode={darkMode}>
            <ButtonGroup
              options={DECK_TYPES}
              value={typeSpecific.deck_type}
              onChange={(v) => handleChange('deck_type', v)}
              darkMode={darkMode}
            />
          </FormField>

          {/* Slide Count */}
          <FormField label="Target Slides" hint="Leave empty for auto" darkMode={darkMode}>
            <NumberInput
              value={typeSpecific.slide_count}
              onChange={(v) => handleChange('slide_count', v)}
              min={3}
              max={50}
              placeholder="Auto"
              darkMode={darkMode}
            />
          </FormField>

          {/* Visual Style */}
          <FormField label="Visual Style" darkMode={darkMode}>
            <ButtonGroup
              options={VISUAL_STYLES}
              value={typeSpecific.visual_style}
              onChange={(v) => handleChange('visual_style', v)}
              darkMode={darkMode}
            />
          </FormField>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Checkbox
              label="Include Speaker Notes"
              checked={typeSpecific.include_speaker_notes !== false}
              onChange={(v) => handleChange('include_speaker_notes', v)}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
