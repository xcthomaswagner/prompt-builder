/**
 * Quality Feedback Component
 * 
 * Displays inline quality assessment for generated prompts.
 */

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';

/**
 * Score bar visualization
 */
function ScoreBar({ score }) {
  const getBarColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${getBarColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

/**
 * Dimension badge showing individual dimension score
 */
function DimensionBadge({ name, score }) {
  const getColor = (score) => {
    if (score >= 8) return 'bg-green-100 text-green-700';
    if (score >= 6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div 
      className={`px-2 py-1 rounded text-xs font-medium ${getColor(score)}`}
      title={`${name}: ${score}/10`}
    >
      {name.split('_').map(w => w[0].toUpperCase()).join('')}: {score}
    </div>
  );
}

/**
 * Feedback section (strengths or improvements)
 */
function FeedbackSection({ title, items, icon, iconColor }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <span className={iconColor}>{icon}</span>
        {title}
      </div>
      <ul className="space-y-1 ml-6">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-600 list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Main Quality Feedback component
 */
export default function QualityFeedback({ 
  quality, 
  onImprove, 
  isImproving = false,
  className = '' 
}) {
  const [expanded, setExpanded] = useState(false);

  if (!quality) return null;

  const { overall_score, interpretation, dimensions, strengths, improvements } = quality;

  const scoreColor = overall_score >= 80
    ? 'text-green-600'
    : overall_score >= 60
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <div className={`bg-slate-50 rounded-lg border border-slate-200 ${className}`}>
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Quality</span>
          </div>
          
          <ScoreBar score={overall_score} />
          
          <span className={`font-bold ${scoreColor}`}>
            {overall_score}%
          </span>
          
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            interpretation?.color === 'green' 
              ? 'bg-green-100 text-green-700'
              : interpretation?.color === 'yellow'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}>
            {interpretation?.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dimension badges (collapsed view) */}
          {!expanded && dimensions && (
            <div className="hidden md:flex gap-1">
              {Object.entries(dimensions).slice(0, 3).map(([key, dim]) => (
                <DimensionBadge key={key} name={key} score={dim.score} />
              ))}
              {Object.keys(dimensions).length > 3 && (
                <span className="text-xs text-slate-400">
                  +{Object.keys(dimensions).length - 3}
                </span>
              )}
            </div>
          )}
          
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-4">
          {/* All Dimension Scores */}
          {dimensions && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-600">Dimension Scores</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(dimensions).map(([key, dim]) => (
                  <div 
                    key={key}
                    className="bg-white rounded border border-slate-200 p-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-sm font-bold ${
                        dim.score >= 8 ? 'text-green-600' :
                        dim.score >= 6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {dim.score}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {dim.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          <FeedbackSection
            title="Strengths"
            items={strengths}
            icon={<CheckCircle className="w-4 h-4" />}
            iconColor="text-green-500"
          />

          {/* Improvements */}
          <FeedbackSection
            title="Could Improve"
            items={improvements}
            icon={<AlertCircle className="w-4 h-4" />}
            iconColor="text-yellow-500"
          />

          {/* Auto-Improve Button */}
          {improvements && improvements.length > 0 && onImprove && (
            <button
              onClick={onImprove}
              disabled={isImproving}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-colors
                ${isImproving
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }
              `}
            >
              <RefreshCw className={`w-4 h-4 ${isImproving ? 'animate-spin' : ''}`} />
              {isImproving ? 'Improving...' : 'Auto-Improve Based on Feedback'}
            </button>
          )}

          {/* Quick check notice */}
          {quality.quick_check && (
            <p className="text-xs text-slate-400 italic">
              * Quick heuristic check. Run full assessment for detailed feedback.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
