import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Dimension labels for Judge v2 evaluation display
 */
const DIMENSION_LABELS = [
  { key: 'instructionAdherence', label: 'Instructions' },
  { key: 'taskQuality', label: 'Task Quality' },
  { key: 'structureFormat', label: 'Structure' },
  { key: 'toneAudience', label: 'Tone' }
];

/**
 * ResultsGrid – displays experiment results in a table/card grid.
 *
 * @param {Object} props
 * @param {Array<{ config: { tone: string, length: string, format: string }, blueprintResult: string, status?: string, error?: string }>} props.results
 */
export default function ResultsGrid({ results, darkMode = false }) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  if (!results || results.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        No results yet. Configure your matrix and run an experiment.
      </div>
    );
  }

  const toggleRow = (index) => {
    const next = new Set(expandedRows);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedRows(next);
  };

  const expandAll = () => {
    setExpandedRows(new Set(results.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Copy all completed results (prefer executionResult if available, fallback to blueprintResult)
  const handleCopyAll = async () => {
    const completedResults = results.filter(r => (r.executionResult || r.blueprintResult) && !r.error);
    if (completedResults.length === 0) return;

    const allText = completedResults.map((r, i) => {
      const header = `=== ${r.config.tone} • ${r.config.length} • ${r.config.format} ===`;
      const content = r.executionResult || r.blueprintResult;
      return `${header}\n\n${content}`;
    }).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(allText);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  const completedCount = results.filter(r => (r.executionResult || r.blueprintResult) && !r.error).length;

  // Render status indicator (circle for pending/running, nothing for complete)
  const renderStatusIndicator = (result) => {
    if (result.status === 'pending') {
      return <Loader2 size={14} className="text-slate-300" />;
    }
    if (result.status === 'running') {
      return <Loader2 size={14} className="text-slate-400 animate-spin" />;
    }
    if (result.status === 'error' || result.error) {
      return <span className="w-3 h-3 rounded-full bg-red-400" />;
    }
    // Complete items show no circle
    return null;
  };

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 7) return 'text-green-600 bg-green-100';
    if (score >= 4) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  // Render AI score as small gray text (for completed items, shown on right side)
  const renderAiScoreCompact = (result) => {
    const ai = result.evaluation?.ai;
    if (!ai) return null;
    if (result.status !== 'complete' && !result.blueprintResult) return null;
    const score = ai.composite || ai.score;
    if (!score) return null;
    return (
      <span className={`text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {score}/10
      </span>
    );
  };

  return (
    <div className={`rounded-xl shadow-sm border p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          Results ({results.length})
        </h3>
        <div className="flex items-center gap-3">
          {/* Copy All Button */}
          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:shadow-md transition-all"
            >
              {copiedId === 'all' ? (
                <>
                  <CheckCircle2 size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardList size={14} />
                  Copy All ({completedCount})
                </>
              )}
            </button>
          )}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={expandAll}
              className="text-cyan-600 hover:text-cyan-500 transition-colors"
            >
              Expand All
            </button>
            <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>|</span>
            <button
              type="button"
              onClick={collapseAll}
              className={`transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((result, index) => {
          const isExpanded = expandedRows.has(index);
          const configLabel = `${result.config.tone} • ${result.config.length} • ${result.config.format}`;

          return (
            <div
              key={index}
              className={`rounded-lg overflow-hidden ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-50 border border-slate-100'}`}
            >
              {/* Header Row */}
              <button
                type="button"
                onClick={() => toggleRow(index)}
                className={`w-full flex items-center justify-between p-3 transition-colors text-left ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-2">
                  {renderStatusIndicator(result)}
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {configLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderAiScoreCompact(result)}
                  {(result.executionResult || result.blueprintResult) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(result.executionResult || result.blueprintResult, index);
                      }}
                      className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                      title="Copy this result"
                    >
                      {copiedId === index ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                  ) : (
                    <ChevronDown size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className={`border-t p-4 space-y-4 ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                  {result.error ? (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                      Error: {result.error}
                    </div>
                  ) : (
                    <>
                      {/* Blueprint */}
                      {result.blueprintResult && (
                        <div>
                          <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Blueprint</h4>
                          <pre className={`text-sm whitespace-pre-wrap font-mono p-4 rounded-lg max-h-64 overflow-auto border ${darkMode ? 'text-slate-300 bg-slate-700 border-slate-600' : 'text-slate-700 bg-slate-50 border-slate-100'}`}>
                            {result.blueprintResult}
                          </pre>
                        </div>
                      )}

                      {/* Execution Result */}
                      {result.executionResult && (
                        <div>
                          <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Execution Result
                            {result.executionModelId && (
                              <span className={`ml-2 font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({result.executionModelId})</span>
                            )}
                          </h4>
                          <pre className={`text-sm whitespace-pre-wrap font-mono p-4 rounded-lg max-h-64 overflow-auto border ${darkMode ? 'text-slate-300 bg-blue-900/30 border-blue-800' : 'text-slate-700 bg-blue-50 border-blue-100'}`}>
                            {result.executionResult}
                          </pre>
                        </div>
                      )}

                      {/* AI Evaluation */}
                      {result.evaluation?.ai && (
                        <div>
                          <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            AI Evaluation
                            {result.judgeModelId && (
                              <span className={`ml-2 font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({result.judgeModelId})</span>
                            )}
                          </h4>
                          <div className={`p-4 rounded-lg border space-y-3 ${darkMode ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-100'}`}>
                            {/* Composite Score + Summary */}
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`text-2xl font-bold ${getScoreColor(result.evaluation.ai.composite || result.evaluation.ai.score).split(' ')[0]}`}>
                                  {result.evaluation.ai.composite || result.evaluation.ai.score}
                                </div>
                                <div className="text-xs text-slate-400">/ 10</div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-slate-700">{result.evaluation.ai.summary || result.evaluation.ai.critique}</p>
                              </div>
                            </div>
                            
                            {/* Dimension Breakdown (v2) */}
                            {result.evaluation.ai.dimensions && (
                              <div className="border-t border-purple-200 pt-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {DIMENSION_LABELS.map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between bg-white/50 rounded px-2 py-1">
                                      <span className="text-slate-500">{label}</span>
                                      <span className={`font-semibold ${getScoreColor(result.evaluation.ai.dimensions[key]).split(' ')[0]}`}>
                                        {result.evaluation.ai.dimensions[key]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Justifications (collapsible) */}
                                {result.evaluation.ai.justifications && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-purple-600 cursor-pointer hover:text-purple-800">
                                      View justifications
                                    </summary>
                                    <div className="mt-2 space-y-2 text-xs text-slate-600">
                                      {DIMENSION_LABELS.map(({ key, label }) => (
                                        result.evaluation.ai.justifications[key] && (
                                          <div key={key} className="bg-white/70 rounded p-2">
                                            <span className="font-medium text-slate-700">{label}:</span>{' '}
                                            {result.evaluation.ai.justifications[key]}
                                          </div>
                                        )
                                      ))}
                                    </div>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Execution Error */}
                      {result.executionError && (
                        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-100">
                          Execution Error: {result.executionError}
                        </div>
                      )}

                      {!result.blueprintResult && (
                        <div className={`text-sm italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          Waiting for result...
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
