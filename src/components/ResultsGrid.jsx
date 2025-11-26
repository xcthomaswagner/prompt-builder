import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, CheckCircle2, ClipboardList } from 'lucide-react';

/**
 * ResultsGrid – displays experiment results in a table/card grid.
 *
 * @param {Object} props
 * @param {Array<{ config: { tone: string, length: string, format: string }, blueprintResult: string, status?: string, error?: string }>} props.results
 */
export default function ResultsGrid({ results }) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
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

  // Copy all completed results
  const handleCopyAll = async () => {
    const completedResults = results.filter(r => r.blueprintResult && !r.error);
    if (completedResults.length === 0) return;

    const allText = completedResults.map((r, i) => {
      const header = `=== ${r.config.tone} • ${r.config.length} • ${r.config.format} ===`;
      return `${header}\n\n${r.blueprintResult}`;
    }).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(allText);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  const completedCount = results.filter(r => r.blueprintResult && !r.error).length;

  const getStatusBadge = (result) => {
    if (result.status === 'pending') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-600">Pending</span>;
    }
    if (result.status === 'running') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-600 animate-pulse">Running</span>;
    }
    if (result.status === 'error' || result.error) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">Error</span>;
    }
    if (result.blueprintResult) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600">Complete</span>;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
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
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-slate-500 hover:text-slate-700 transition-colors"
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
              className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden"
            >
              {/* Header Row */}
              <button
                type="button"
                onClick={() => toggleRow(index)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {configLabel}
                  </span>
                  {getStatusBadge(result)}
                </div>
                <div className="flex items-center gap-2">
                  {result.blueprintResult && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(result.blueprintResult, index);
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
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-4 bg-white">
                  {result.error ? (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                      Error: {result.error}
                    </div>
                  ) : result.blueprintResult ? (
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg max-h-96 overflow-auto border border-slate-100">
                      {result.blueprintResult}
                    </pre>
                  ) : (
                    <div className="text-sm text-slate-400 italic">
                      Waiting for result...
                    </div>
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
