/**
 * Reasoning Panel Component
 * 
 * Shows users why the Builder made specific choices.
 * Builds trust and teaches users about prompt craft.
 */

import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Setting tag showing an inferred value
 */
function SettingTag({ label, value, darkMode = false }) {
  if (!value) return null;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
      <span className={darkMode ? 'text-indigo-400' : 'text-indigo-400'}>{label}:</span>
      <span className="capitalize">{value}</span>
    </span>
  );
}

/**
 * Main Reasoning Panel component
 */
export default function ReasoningPanel({ 
  reasoning = {}, 
  inferredSettings = {},
  className = '',
  darkMode = false
}) {
  const [expanded, setExpanded] = useState(false);

  // Don't render if no reasoning available
  const hasReasoning = reasoning && Object.keys(reasoning).length > 0;
  const hasSettings = inferredSettings && (
    inferredSettings.tone || 
    inferredSettings.format || 
    inferredSettings.length
  );

  if (!hasReasoning && !hasSettings) {
    return null;
  }

  return (
    <div className={`rounded-lg border ${darkMode ? 'bg-indigo-900/20 border-indigo-800/50' : 'bg-indigo-50 border-indigo-100'} ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full p-4 flex items-center justify-between transition-colors rounded-lg ${darkMode ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-100/50'}`}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
            Why these settings?
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Show tags in collapsed view */}
          {!expanded && hasSettings && (
            <div className="hidden sm:flex gap-1">
              <SettingTag label="Tone" value={inferredSettings.tone} darkMode={darkMode} />
              <SettingTag label="Format" value={inferredSettings.format} darkMode={darkMode} />
              <SettingTag label="Length" value={inferredSettings.length} darkMode={darkMode} />
            </div>
          )}
          
          {expanded ? (
            <ChevronUp className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-400'}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-400'}`} />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Inferred Settings Tags */}
          {hasSettings && (
            <div className="flex flex-wrap gap-2">
              <SettingTag label="Tone" value={inferredSettings.tone} darkMode={darkMode} />
              <SettingTag label="Format" value={inferredSettings.format} darkMode={darkMode} />
              <SettingTag label="Length" value={inferredSettings.length} darkMode={darkMode} />
            </div>
          )}

          {/* Reasoning Explanations */}
          {hasReasoning && (
            <div className="space-y-3">
              {Object.entries(reasoning).map(([key, explanation]) => (
                <div key={key} className="text-sm">
                  <span className={`font-medium capitalize ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    {key.replace(/_/g, ' ')}:
                  </span>{' '}
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{explanation}</span>
                </div>
              ))}
            </div>
          )}

          {/* Helpful tip */}
          <p className={`text-xs italic pt-2 border-t ${darkMode ? 'text-indigo-400 border-indigo-800/50' : 'text-indigo-400 border-indigo-100'}`}>
            These settings were inferred from your input. You can override them using the options above.
          </p>
        </div>
      )}
    </div>
  );
}
