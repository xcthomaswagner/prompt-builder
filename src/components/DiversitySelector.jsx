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
 * 
 * Navigation: Smooth continuous slider, level changes at 50% midpoint between levels
 * Data: Always outputs discrete level IDs (safe, balanced, diverse, creative, wild)
 *       which map to their log probability thresholds (1.0, 0.50, 0.10, 0.05, 0.01)
 */
function NoveltySlider({ value, onChange, darkMode }) {
  const levels = DIVERSITY_LEVELS_ORDERED;
  const currentLevel = DIVERSITY_LEVELS[value];
  const currentIndex = levels.findIndex(l => l.id === value);

  // Track live slider position for smooth visual movement
  const [sliderPosition, setSliderPosition] = useState(currentIndex * 25);

  // Map continuous position (0-100) to nearest level index (at 50% midpoint)
  const getIndexFromPosition = (position) => {
    // Each level occupies 25% of the track, midpoints at 12.5, 37.5, 62.5, 87.5
    if (position < 12.5) return 0;      // Safe
    if (position < 37.5) return 1;      // Balanced  
    if (position < 62.5) return 2;      // Diverse
    if (position < 87.5) return 3;      // Creative
    return 4;                           // Wild
  };

  // Handle slider change - smooth movement, level changes at midpoint
  const handleSliderChange = (e) => {
    const position = parseInt(e.target.value, 10);
    setSliderPosition(position); // Smooth visual update
    
    const newIndex = getIndexFromPosition(position);
    if (newIndex !== currentIndex) {
      // onChange receives the level ID, which carries the correct probabilityThreshold
      onChange(levels[newIndex].id);
    }
  };

  // Snap to center position when mouse released
  const handleSliderRelease = () => {
    setSliderPosition(currentIndex * 25);
  };

  // Click on a label to select that level
  const handleLabelClick = (levelId, index) => {
    onChange(levelId);
    setSliderPosition(index * 25);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Novelty Level
        </label>
        <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          p&lt;{currentLevel.probabilityThreshold}
        </span>
      </div>

      {/* Smooth draggable slider */}
      <div className="relative">
        {/* Track background */}
        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
          <div 
            className="h-full rounded-full transition-all duration-100 bg-gradient-to-r from-green-400 via-yellow-400 to-purple-500"
            style={{ width: `${sliderPosition}%` }}
          />
        </div>

        {/* Range input - smooth continuous movement */}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={sliderPosition}
          onChange={handleSliderChange}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-cyan-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-cyan-600
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:active:cursor-grabbing
            [&::-webkit-slider-thumb]:hover:bg-cyan-400
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition-all
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-cyan-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-cyan-600
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-grab
            [&::-moz-range-thumb]:active:cursor-grabbing
            [&::-moz-range-track]:bg-transparent
            [&::-webkit-slider-runnable-track]:bg-transparent"
          aria-label="Novelty level slider"
        />
      </div>

      {/* Level labels - positioned below slider, active one gets focus styling */}
      <div className="flex justify-between -mt-1">
        {levels.map((level, index) => {
          const isSelected = value === level.id;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => handleLabelClick(level.id, index)}
              className={`
                px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 border
                ${isSelected
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                  : darkMode 
                    ? 'bg-transparent border-transparent text-slate-500 hover:text-slate-400' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                }
              `}
              style={{ minWidth: '60px', textAlign: 'center' }}
            >
              {level.label}
            </button>
          );
        })}
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
