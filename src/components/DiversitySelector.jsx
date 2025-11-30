/**
 * Diversity Selector Component
 * 
 * Controls for Verbalized Sampling - allows switching between
 * Focused (standard) and Exploratory (VS) generation modes.
 * 
 * @module components/DiversitySelector
 */

import { useState } from 'react';
import { Sparkles, Target, Shuffle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { DIVERSITY_LEVELS, DIVERSITY_LEVELS_ORDERED } from '../lib/verbalizedSampling';

/**
 * Mode toggle button
 */
function ModeButton({ icon: Icon, label, description, selected, onClick, darkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
        ${selected
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
          : darkMode 
            ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50' 
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }
      `}
    >
      <Icon 
        className={`w-6 h-6 ${selected ? 'text-cyan-600' : darkMode ? 'text-slate-400' : 'text-slate-500'}`} 
      />
      <div className="text-center">
        <div className={`text-sm font-semibold ${selected ? 'text-cyan-700 dark:text-cyan-400' : darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </div>
        <div className={`text-xs mt-0.5 ${selected ? 'text-cyan-600 dark:text-cyan-500' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {description}
        </div>
      </div>
    </button>
  );
}

/**
 * Get color scheme for a diversity level
 */
function getLevelColors(levelId) {
  const colors = {
    safe: { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'bg-green-900/30', darkText: 'text-green-400' },
    balanced: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/30', darkText: 'text-blue-400' },
    diverse: { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'bg-yellow-900/30', darkText: 'text-yellow-400' },
    creative: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-900/30', darkText: 'text-orange-400' },
    wild: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-900/30', darkText: 'text-purple-400' },
  };
  return colors[levelId] || colors.balanced;
}

/**
 * Get track fill width based on selected level
 */
function getTrackWidth(levelId) {
  const widths = {
    safe: 'w-0',
    balanced: 'w-1/4',
    diverse: 'w-2/4',
    creative: 'w-3/4',
    wild: 'w-full',
  };
  return widths[levelId] || 'w-2/4';
}

/**
 * Novelty slider component - 5 levels based on paper's probability thresholds
 */
function NoveltySlider({ value, onChange, darkMode }) {
  const levels = DIVERSITY_LEVELS_ORDERED;
  const currentLevel = DIVERSITY_LEVELS[value];
  const colors = getLevelColors(value);
  const currentIndex = levels.findIndex(l => l.id === value);

  return (
    <div className="space-y-3">
      {/* Header with current level */}
      <div className="flex items-center justify-between">
        <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Novelty Level
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${darkMode ? colors.darkBg + ' ' + colors.darkText : colors.bg + ' ' + colors.text}`}>
            {currentLevel.label}
          </span>
          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            p&lt;{currentLevel.probabilityThreshold}
          </span>
        </div>
      </div>

      {/* 5-position slider */}
      <div className="relative pt-2 pb-1">
        {/* Track background */}
        <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
          {/* Gradient fill based on position */}
          <div 
            className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r from-green-400 via-yellow-400 to-purple-500 ${getTrackWidth(value)}`}
          />
        </div>
        
        {/* Clickable buttons positioned on track */}
        <div className="absolute inset-x-0 top-0 flex justify-between">
          {levels.map((level, index) => (
            <button
              key={level.id}
              type="button"
              onClick={() => onChange(level.id)}
              className={`
                w-6 h-6 rounded-full border-2 transition-all cursor-pointer
                ${value === level.id 
                  ? 'bg-white border-cyan-500 scale-110 shadow-lg ring-2 ring-cyan-300' 
                  : index <= currentIndex
                    ? darkMode 
                      ? 'bg-slate-600 border-slate-400 hover:border-cyan-400' 
                      : 'bg-slate-100 border-slate-300 hover:border-cyan-400'
                    : darkMode 
                      ? 'bg-slate-700 border-slate-500 hover:border-cyan-400 hover:bg-slate-600' 
                      : 'bg-white border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
                }
              `}
              title={`${level.label} (p<${level.probabilityThreshold})`}
              aria-label={`Set novelty to ${level.label}`}
            />
          ))}
        </div>
      </div>

      {/* Level labels - show all 5 */}
      <div className="flex justify-between text-xs">
        {levels.map((level) => (
          <span 
            key={level.id}
            className={`text-center ${
              value === level.id 
                ? darkMode ? 'text-cyan-400 font-medium' : 'text-cyan-600 font-medium'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
            style={{ width: '20%' }}
          >
            {level.label}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {currentLevel.description}
      </p>
    </div>
  );
}

/**
 * Main Diversity Selector component
 */
export default function DiversitySelector({ 
  mode, 
  onModeChange, 
  diversityLevel, 
  onDiversityChange,
  disabled = false,
  darkMode = false 
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <Shuffle className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Generation Mode
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
          title="What is this?"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className={`px-4 py-3 text-xs border-b ${darkMode ? 'bg-slate-700/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
          <p className="mb-2">
            <strong className={darkMode ? 'text-slate-300' : 'text-slate-600'}>Verbalized Sampling</strong> generates multiple distinct options 
            by sampling from different parts of the probability distribution.
          </p>
          <p>
            <strong className={darkMode ? 'text-slate-300' : 'text-slate-600'}>Focused:</strong> Single best answer (standard prompting)<br />
            <strong className={darkMode ? 'text-slate-300' : 'text-slate-600'}>Exploratory:</strong> 5 diverse options from typical to novel
          </p>
        </div>
      )}

      {/* Mode selection */}
      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          <ModeButton
            icon={Target}
            label="Focused"
            description="Single best answer"
            selected={mode === 'focused'}
            onClick={() => !disabled && onModeChange('focused')}
            darkMode={darkMode}
          />
          <ModeButton
            icon={Sparkles}
            label="Exploratory"
            description="5 diverse options"
            selected={mode === 'exploratory'}
            onClick={() => !disabled && onModeChange('exploratory')}
            darkMode={darkMode}
          />
        </div>

        {/* Novelty slider (only in exploratory mode) */}
        {mode === 'exploratory' && (
          <div className={`pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <NoveltySlider
              value={diversityLevel}
              onChange={onDiversityChange}
              darkMode={darkMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
