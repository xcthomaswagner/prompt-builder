/**
 * Comms-specific form fields
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
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

export default function CommsForm({ spec, onChange, darkMode = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
      >
        <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          <MessageSquare className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          Communication Settings
        </div>
        {isExpanded ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Channel */}
          <FormField label="Channel" darkMode={darkMode}>
            <ButtonGroup
              options={CHANNELS}
              value={typeSpecific.channel || 'email'}
              onChange={(v) => handleChange('channel', v)}
              size="sm"
              darkMode={darkMode}
            />
          </FormField>

          {/* Formality */}
          <FormField label="Formality" darkMode={darkMode}>
            <ButtonGroup
              options={FORMALITY_LEVELS}
              value={typeSpecific.formality_level || 'professional'}
              onChange={(v) => handleChange('formality_level', v)}
              darkMode={darkMode}
            />
          </FormField>

          {/* Response Urgency */}
          <FormField label="Response Urgency" hint="How quickly do you need a response?" darkMode={darkMode}>
            <ButtonGroup
              options={URGENCY_LEVELS}
              value={typeSpecific.response_urgency || 'normal'}
              onChange={(v) => handleChange('response_urgency', v)}
              darkMode={darkMode}
            />
          </FormField>

          {/* Thread Context */}
          <FormField 
            label="Thread Context" 
            hint="Is this a reply? Provide context"
            darkMode={darkMode}
          >
            <TextInput
              value={typeSpecific.thread_context}
              onChange={(v) => handleChange('thread_context', v)}
              placeholder="e.g., Following up on yesterday's meeting..."
              darkMode={darkMode}
            />
          </FormField>

          {/* Action Items */}
          <FormField 
            label="Action Items" 
            hint="What do you need from the recipient?"
            darkMode={darkMode}
          >
            <TextInput
              value={typeSpecific.action_items_text}
              onChange={(v) => handleChange('action_items_text', v)}
              placeholder="e.g., Review document, Schedule meeting"
              darkMode={darkMode}
            />
          </FormField>

          {/* Greeting/Signature toggles */}
          {showGreetingOptions && (
            <div className="flex flex-wrap gap-4 pt-2">
              <Checkbox
                label="Include Greeting"
                checked={typeSpecific.include_greeting !== false}
                onChange={(v) => handleChange('include_greeting', v)}
                darkMode={darkMode}
              />
              <Checkbox
                label="Include Signature"
                checked={typeSpecific.include_signature !== false}
                onChange={(v) => handleChange('include_signature', v)}
                darkMode={darkMode}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
