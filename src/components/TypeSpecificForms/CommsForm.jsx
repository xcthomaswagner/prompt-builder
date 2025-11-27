/**
 * Comms-specific form fields
 */

import { FormField, ButtonGroup, Checkbox, TextInput } from '../ui/FormField.jsx';

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'memo', label: 'Memo' },
  { value: 'letter', label: 'Letter' },
  { value: 'sms', label: 'SMS' },
  { value: 'chat', label: 'Chat' },
];

const FORMALITY_LEVELS = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'formal', label: 'Formal' },
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'asap', label: 'ASAP' },
];

export default function CommsForm({ spec, onChange }) {
  const typeSpecific = spec.typeSpecific || {};

  const handleChange = (field, value) => {
    onChange('typeSpecific', {
      ...typeSpecific,
      [field]: value,
    });
  };

  // Show greeting/signature options based on channel
  const showGreetingOptions = ['email', 'letter', 'memo'].includes(typeSpecific.channel);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        Communication Settings
      </h4>

      {/* Channel */}
      <FormField label="Channel">
        <ButtonGroup
          options={CHANNELS}
          value={typeSpecific.channel || 'email'}
          onChange={(v) => handleChange('channel', v)}
          size="sm"
        />
      </FormField>

      {/* Formality */}
      <FormField label="Formality">
        <ButtonGroup
          options={FORMALITY_LEVELS}
          value={typeSpecific.formality_level || 'professional'}
          onChange={(v) => handleChange('formality_level', v)}
        />
      </FormField>

      {/* Response Urgency */}
      <FormField label="Response Urgency" hint="How quickly do you need a response?">
        <ButtonGroup
          options={URGENCY_LEVELS}
          value={typeSpecific.response_urgency || 'normal'}
          onChange={(v) => handleChange('response_urgency', v)}
        />
      </FormField>

      {/* Thread Context */}
      <FormField 
        label="Thread Context" 
        hint="Is this a reply? Provide context"
      >
        <TextInput
          value={typeSpecific.thread_context}
          onChange={(v) => handleChange('thread_context', v)}
          placeholder="e.g., Following up on yesterday's meeting..."
        />
      </FormField>

      {/* Action Items */}
      <FormField 
        label="Action Items" 
        hint="What do you need from the recipient?"
      >
        <TextInput
          value={typeSpecific.action_items_text}
          onChange={(v) => handleChange('action_items_text', v)}
          placeholder="e.g., Review document, Schedule meeting"
        />
      </FormField>

      {/* Greeting/Signature toggles */}
      {showGreetingOptions && (
        <div className="flex flex-wrap gap-4 pt-2">
          <Checkbox
            label="Include Greeting"
            checked={typeSpecific.include_greeting !== false}
            onChange={(v) => handleChange('include_greeting', v)}
          />
          <Checkbox
            label="Include Signature"
            checked={typeSpecific.include_signature !== false}
            onChange={(v) => handleChange('include_signature', v)}
          />
        </div>
      )}
    </div>
  );
}
