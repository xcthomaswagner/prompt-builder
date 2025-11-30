/**
 * Verbalized Options Grid Component
 * 
 * Displays VS-generated options as interactive cards.
 * Users can preview, copy, or select options.
 * 
 * @module components/VerbalizedOptionsGrid
 */

import { useState } from 'react';
import { 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Target,
  Lightbulb,
  TrendingUp,
  Loader2
} from 'lucide-react';

/**
 * Probability badge component
 */
function ProbabilityBadge({ probability, label, darkMode }) {
  const percentage = Math.round(probability * 100);
  
  const colorClasses = {
    green: darkMode 
      ? 'bg-green-900/30 text-green-400 border-green-700' 
      : 'bg-green-50 text-green-700 border-green-200',
    yellow: darkMode 
      ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' 
      : 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: darkMode 
      ? 'bg-purple-900/30 text-purple-400 border-purple-700' 
      : 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${colorClasses[label.color]}`}>
      {label.label} ({percentage}%)
    </div>
  );
}

/**
 * Single option card
 */
function OptionCard({ option, index, isSelected, onSelect, onCopy, darkMode }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(option.text);
    setCopied(true);
    onCopy?.(option);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIconForProbability = (prob) => {
    if (prob >= 0.3) return Target;
    if (prob >= 0.15) return TrendingUp;
    return Lightbulb;
  };

  const Icon = getIconForProbability(option.probability);
  const previewLength = 150;
  const needsExpand = option.text.length > previewLength;
  const displayText = expanded ? option.text : option.text.slice(0, previewLength) + (needsExpand ? '...' : '');

  return (
    <div
      className={`
        relative rounded-xl border-2 transition-all cursor-pointer
        ${isSelected
          ? 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-800'
          : darkMode
            ? 'border-slate-700 hover:border-slate-600'
            : 'border-slate-200 hover:border-slate-300'
        }
        ${darkMode ? 'bg-slate-800' : 'bg-white'}
      `}
      onClick={() => onSelect?.(option)}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
            ${option.label.color === 'green'
              ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              : option.label.color === 'yellow'
                ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                : darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
            }
          `}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              {option.approach}
            </div>
            <ProbabilityBadge 
              probability={option.probability} 
              label={option.label} 
              darkMode={darkMode} 
            />
          </div>
        </div>

        <button
          onClick={handleCopy}
          className={`
            p-2 rounded-lg transition-colors
            ${copied
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : darkMode
                ? 'hover:bg-slate-700 text-slate-400'
                : 'hover:bg-slate-100 text-slate-500'
            }
          `}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {displayText}
        </p>

        {needsExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className={`
              flex items-center gap-1 mt-2 text-xs font-medium
              ${darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}
            `}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show more
              </>
            )}
          </button>
        )}
      </div>

      {/* Reasoning footer */}
      <div className={`px-4 py-3 border-t ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
        <p className={`text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {option.reasoning}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for options
 */
function OptionSkeleton({ darkMode }) {
  return (
    <div className={`rounded-xl border-2 animate-pulse ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
      <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <div className="space-y-2">
            <div className={`h-4 w-24 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`h-3 w-16 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className={`h-3 w-full rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
        <div className={`h-3 w-3/4 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
        <div className={`h-3 w-1/2 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
      </div>
    </div>
  );
}

/**
 * Main Verbalized Options Grid component
 */
export default function VerbalizedOptionsGrid({ 
  options = [],
  selectedId,
  onSelect,
  onCopy,
  isLoading = false,
  error = null,
  config = {},
  darkMode = false 
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className={`w-5 h-5 animate-spin ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Generating diverse options...
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <OptionSkeleton key={i} darkMode={darkMode} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-xl border text-center ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
        <p className="font-medium">Failed to generate options</p>
        <p className="text-sm mt-1 opacity-75">{error}</p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className={`p-8 rounded-xl border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <Sparkles className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Run an experiment in Exploratory mode to generate diverse options
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            {options.length} Options Generated
          </span>
          {config.diversityLevel && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {config.diversityLevel} novelty
            </span>
          )}
        </div>
        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Click to select, or copy individual options
        </p>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option, index) => (
          <OptionCard
            key={option.id || index}
            option={option}
            index={index}
            isSelected={selectedId === option.id}
            onSelect={onSelect}
            onCopy={onCopy}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}
