/**
 * Template Selector Component
 * 
 * Quick-start template selection UI.
 */

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { quickStartTemplates, getTemplatesByType } from '../lib/templates/quickStart.js';

/**
 * Template card component
 */
function TemplateCard({ template, onClick, isSelected, darkMode = false }) {
  // Dynamically get icon from lucide-react
  const IconComponent = Icons[template.icon] || Icons.FileText;

  return (
    <button
      onClick={() => onClick(template)}
      className={`
        p-3 rounded-lg border text-left transition-all
        ${darkMode 
          ? `hover:border-indigo-400 hover:bg-indigo-900/30 ${isSelected ? 'border-indigo-500 bg-indigo-900/30 ring-2 ring-indigo-400' : 'border-slate-600 bg-slate-700'}`
          : `hover:border-indigo-300 hover:bg-indigo-50 ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white'}`
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${isSelected 
            ? 'bg-indigo-100 text-indigo-600' 
            : darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-100 text-slate-600'}
        `}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {template.label}
          </h4>
          <p className={`text-xs line-clamp-2 mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {template.description}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Main Template Selector component
 */
export default function TemplateSelector({ 
  onSelect, 
  selectedId = null,
  outputType = null,
  className = '',
  darkMode = false
}) {
  const [filter, setFilter] = useState(outputType || 'all');

  // Filter templates
  const filteredTemplates = filter === 'all' 
    ? quickStartTemplates 
    : getTemplatesByType(filter);

  // Get unique output types for filter
  const outputTypes = [...new Set(quickStartTemplates.map(t => t.outputType))];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Quick Start Templates</h3>
        
        {/* Filter dropdown */}
        {!outputType && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`text-xs border rounded px-2 py-1 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}
          >
            <option value="all">All Types</option>
            {outputTypes.map(type => (
              <option key={type} value={type} className="capitalize">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={onSelect}
            isSelected={selectedId === template.id}
            darkMode={darkMode}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <p className={`text-sm text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          No templates available for this type.
        </p>
      )}

      <p className={`text-xs text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Select a template to pre-fill settings, or start from scratch below.
      </p>
    </div>
  );
}

/**
 * Compact template selector (for sidebar or modal)
 */
export function CompactTemplateSelector({ onSelect, outputType, className = '', darkMode = false }) {
  const templates = outputType 
    ? getTemplatesByType(outputType) 
    : quickStartTemplates.slice(0, 6);

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className={`text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Quick Start
      </h4>
      <div className="space-y-1">
        {templates.map((template) => {
          const IconComponent = Icons[template.icon] || Icons.FileText;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <span className={`text-sm truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{template.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
