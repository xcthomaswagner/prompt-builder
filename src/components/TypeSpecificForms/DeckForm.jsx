/**
 * Deck-specific form fields
 */

import { FormField, ButtonGroup, Checkbox, NumberInput, Select } from '../ui/FormField.jsx';

const PRESENTATION_CONTEXTS = [
  { value: 'keynote', label: 'Keynote' },
  { value: 'internal', label: 'Internal' },
  { value: 'pitch', label: 'Pitch' },
  { value: 'training', label: 'Training' },
];

const DURATION_OPTIONS = [
  { value: 5, label: '5 min (Lightning)' },
  { value: 15, label: '15 min (Standard)' },
  { value: 30, label: '30 min (Deep dive)' },
  { value: 45, label: '45 min (Workshop)' },
  { value: 60, label: '60 min (Full session)' },
];

const VISUAL_STYLES = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'data-heavy', label: 'Data Heavy' },
  { value: 'image-rich', label: 'Image Rich' },
];

export default function DeckForm({ spec, onChange }) {
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
        Deck Settings
      </h4>

      {/* Presentation Context */}
      <FormField label="Presentation Context" hint="What type of presentation is this?">
        <ButtonGroup
          options={PRESENTATION_CONTEXTS}
          value={typeSpecific.presentation_context}
          onChange={(v) => handleChange('presentation_context', v)}
        />
      </FormField>

      {/* Duration */}
      <FormField label="Duration">
        <Select
          value={typeSpecific.duration_minutes}
          onChange={(v) => handleChange('duration_minutes', v ? parseInt(v) : null)}
          options={DURATION_OPTIONS}
          placeholder="Auto (based on content)"
        />
      </FormField>

      {/* Slide Count */}
      <FormField label="Target Slides" hint="Leave empty for auto">
        <NumberInput
          value={typeSpecific.slide_count}
          onChange={(v) => handleChange('slide_count', v)}
          min={3}
          max={100}
          placeholder="Auto"
        />
      </FormField>

      {/* Visual Style */}
      <FormField label="Visual Style">
        <ButtonGroup
          options={VISUAL_STYLES}
          value={typeSpecific.visual_style}
          onChange={(v) => handleChange('visual_style', v)}
        />
      </FormField>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4 pt-2">
        <Checkbox
          label="Include Speaker Notes"
          checked={typeSpecific.include_speaker_notes !== false}
          onChange={(v) => handleChange('include_speaker_notes', v)}
        />
        <Checkbox
          label="Include Visual Suggestions"
          checked={typeSpecific.include_visual_suggestions !== false}
          onChange={(v) => handleChange('include_visual_suggestions', v)}
        />
      </div>
    </div>
  );
}
