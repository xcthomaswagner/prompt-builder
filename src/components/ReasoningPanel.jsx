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
function SettingTag({ label, value }) {
  if (!value) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
      <span className="text-indigo-400">{label}:</span>
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
  className = '' 
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
    <div className={`bg-indigo-50 rounded-lg border border-indigo-100 ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-indigo-100/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-700">
            Why these settings?
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Show tags in collapsed view */}
          {!expanded && hasSettings && (
            <div className="hidden sm:flex gap-1">
              <SettingTag label="Tone" value={inferredSettings.tone} />
              <SettingTag label="Format" value={inferredSettings.format} />
              <SettingTag label="Length" value={inferredSettings.length} />
            </div>
          )}
          
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-indigo-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-indigo-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Inferred Settings Tags */}
          {hasSettings && (
            <div className="flex flex-wrap gap-2">
              <SettingTag label="Tone" value={inferredSettings.tone} />
              <SettingTag label="Format" value={inferredSettings.format} />
              <SettingTag label="Length" value={inferredSettings.length} />
            </div>
          )}

          {/* Reasoning Explanations */}
          {hasReasoning && (
            <div className="space-y-3">
              {Object.entries(reasoning).map(([key, explanation]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium text-indigo-700 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>{' '}
                  <span className="text-slate-600">{explanation}</span>
                </div>
              ))}
            </div>
          )}

          {/* Helpful tip */}
          <p className="text-xs text-indigo-400 italic pt-2 border-t border-indigo-100">
            These settings were inferred from your input. You can override them using the options above.
          </p>
        </div>
      )}
    </div>
  );
}
