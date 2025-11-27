import React, { useState, useEffect } from 'react';
import { Beaker, Play, Loader2, AlertCircle, History, Trash2, Zap, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import MatrixSelector from './MatrixSelector';
import ModelSelector from './ModelSelector';
import ResultsGrid from './ResultsGrid';
import { runMatrixExperiment } from '../lib/experimentRunner';
import {
  createExperiment,
  updateExperiment,
  saveExperimentResult,
  completeExperiment,
  subscribeToExperiments,
  getExperimentWithResults,
  deleteExperiment
} from '../lib/experimentStore';

/**
 * ExperimentMode – top-level container for matrix testing.
 *
 * @param {Object} props
 * @param {Function} props.callLLM - Async function: (userPrompt, systemPrompt) => Promise<response>
 * @param {string} [props.defaultOutputType] - Default output type ID (e.g., 'doc').
 * @param {Object} [props.db] - Firestore instance (optional, for persistence).
 * @param {Object} [props.user] - Current user object (optional, for persistence).
 * @param {Object} [props.apiKeys] - API keys { gemini, openai, anthropic }
 */
export default function ExperimentMode({ callLLM, defaultOutputType = 'doc', db, user, apiKeys = {} }) {
  // Form state
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [outputType, setOutputType] = useState(defaultOutputType);
  const [matrixConfig, setMatrixConfig] = useState({
    tones: ['professional'],
    lengths: ['medium'],
    formats: ['paragraph']
  });

  // Toggles (matching main app)
  const [toggles, setToggles] = useState({
    allowPlaceholders: false,
    stripMeta: true,
    aestheticMode: false
  });

  // Model selection state
  const [executionModel, setExecutionModel] = useState('gemini-2.0-flash');
  const [judgeModel, setJudgeModel] = useState('gemini-2.0-flash');
  const [enableJudge, setEnableJudge] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [currentExperimentId, setCurrentExperimentId] = useState(null);

  // History state
  const [experiments, setExperiments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Persistence enabled check
  const canPersist = db && user?.uid;

  // Subscribe to experiment history
  useEffect(() => {
    if (!canPersist) return;

    const unsubscribe = subscribeToExperiments(db, user.uid, (exps) => {
      setExperiments(exps);
    });

    return () => unsubscribe();
  }, [db, user?.uid, canPersist]);

  const totalCombos = (matrixConfig.tones?.length || 0) *
    (matrixConfig.lengths?.length || 0) *
    (matrixConfig.formats?.length || 0);

  const canRun = originalPrompt.trim().length > 0 && totalCombos > 0 && !isRunning;

  const handleRunExperiment = async () => {
    if (!canRun) return;

    setIsRunning(true);
    setError('');
    setResults([]);
    setProgress({ completed: 0, total: totalCombos });

    // Initialize results with pending status
    const combos = [];
    for (const tone of matrixConfig.tones) {
      for (const length of matrixConfig.lengths) {
        for (const format of matrixConfig.formats) {
          combos.push({ tone, length, format });
        }
      }
    }
    setResults(combos.map(config => ({ config, blueprintResult: '', status: 'pending' })));

    // Create experiment in Firestore if persistence is enabled
    let experimentId = null;
    if (canPersist) {
      try {
        experimentId = await createExperiment(db, user.uid, {
          originalPrompt,
          outputType,
          matrixConfig,
          toggles,
          totalCells: totalCombos,
          executionModel,
          judgeModel: enableJudge ? judgeModel : null,
          enableJudge
        });
        setCurrentExperimentId(experimentId);
      } catch (err) {
        console.error('Failed to create experiment:', err);
        // Continue without persistence
      }
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      const finalResults = await runMatrixExperiment({
        prompt: originalPrompt,
        matrixConfig,
        outputType,
        callLLM,
        toggles,
        models: {
          executionModel,
          judgeModel,
          enableJudge,
          apiKeys
        },
        onProgress: async (completed, total, result) => {
          setProgress({ completed, total });
          setResults(prev => {
            const updated = [...prev];
            const idx = completed - 1;
            if (idx >= 0 && idx < updated.length) {
              updated[idx] = {
                ...result,
                status: result.error ? 'error' : 'complete'
              };
            }
            // Mark next as running
            if (completed < total && updated[completed]) {
              updated[completed] = { ...updated[completed], status: 'running' };
            }
            return updated;
          });

          // Save individual result to Firestore
          if (canPersist && experimentId) {
            try {
              await saveExperimentResult(db, user.uid, experimentId, result);
              await updateExperiment(db, user.uid, experimentId, {
                completedCells: completed
              });
            } catch (err) {
              console.error('Failed to save result:', err);
            }
          }

          if (result.error) {
            errorCount++;
          } else {
            successCount++;
          }
        }
      });

      setResults(finalResults.map(r => ({
        ...r,
        status: r.error ? 'error' : 'complete'
      })));

      // Mark experiment as complete
      if (canPersist && experimentId) {
        try {
          await completeExperiment(db, user.uid, experimentId, successCount, errorCount);
        } catch (err) {
          console.error('Failed to complete experiment:', err);
        }
      }
    } catch (err) {
      setError(err.message || 'Experiment failed');
      
      // Mark experiment as failed
      if (canPersist && experimentId) {
        try {
          await updateExperiment(db, user.uid, experimentId, {
            status: 'failed',
            errorMessage: err.message
          });
        } catch (dbErr) {
          console.error('Failed to update experiment status:', dbErr);
        }
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Load a past experiment
  const handleLoadExperiment = async (experimentId) => {
    if (!canPersist) return;

    setLoadingHistory(true);
    try {
      const experiment = await getExperimentWithResults(db, user.uid, experimentId);
      if (experiment) {
        setOriginalPrompt(experiment.originalPrompt || '');
        setOutputType(experiment.outputType || 'doc');
        setMatrixConfig(experiment.matrixConfig || { tones: [], lengths: [], formats: [] });
        setToggles(experiment.toggles || { allowPlaceholders: false, stripMeta: true, aestheticMode: false });
        setCurrentExperimentId(experimentId);
        
        // Load results
        if (experiment.results && experiment.results.length > 0) {
          setResults(experiment.results.map(r => ({
            config: r.config,
            blueprintResult: r.blueprintResult,
            error: r.error,
            status: r.error ? 'error' : 'complete'
          })));
        } else {
          setResults([]);
        }
        setShowHistory(false);
      }
    } catch (err) {
      console.error('Failed to load experiment:', err);
      setError('Failed to load experiment');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Delete an experiment
  const handleDeleteExperiment = async (experimentId, e) => {
    e.stopPropagation();
    if (!canPersist) return;

    if (!confirm('Delete this experiment?')) return;

    try {
      await deleteExperiment(db, user.uid, experimentId);
      if (currentExperimentId === experimentId) {
        setCurrentExperimentId(null);
        setResults([]);
      }
    } catch (err) {
      console.error('Failed to delete experiment:', err);
    }
  };

  const OUTPUT_TYPE_OPTIONS = [
    { id: 'doc', label: 'Doc' },
    { id: 'deck', label: 'Deck' },
    { id: 'code', label: 'Code' },
    { id: 'copy', label: 'Copy' },
    { id: 'comms', label: 'Comms' },
    { id: 'data', label: 'Data' }
  ];

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="text-cyan-500" size={28} />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Experiment Mode</h2>
              <p className="text-sm text-slate-500">
                Test prompt variations across multiple settings
              </p>
            </div>
          </div>
          
          {canPersist && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showHistory
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History size={16} />
              History ({experiments.length})
            </button>
          )}
        </div>

      {/* Original Prompt Input */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all focus-within:ring-2 focus-within:ring-cyan-100 focus-within:border-cyan-400">
          <label className="text-sm font-semibold text-slate-700 mb-3 block">Your Original Prompt</label>
          <textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder="e.g., Make me a deck about Andrej Karpathy software 3.0"
            className="w-full h-32 resize-none outline-none text-sm text-slate-700 placeholder:text-slate-300"
            disabled={isRunning}
          />
        </div>

      {/* Output Type Selector */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-3 block">Output Type</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {OUTPUT_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setOutputType(opt.id)}
                disabled={isRunning}
                className={`flex flex-col items-center justify-center p-3 min-h-[60px] rounded-lg border transition-all duration-200 ${
                  outputType === opt.id
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

      {/* Matrix Selector */}
        <MatrixSelector
          value={matrixConfig}
          onChange={setMatrixConfig}
        />

        {/* Advanced Settings (Model Selection) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Settings2 className="w-4 h-4 text-slate-500" />
              Advanced Configuration
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showAdvanced && (
            <div className="p-6 space-y-6">
              {/* Model Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModelSelector
                  label="Execution Model"
                  value={executionModel}
                  onChange={setExecutionModel}
                  disabled={isRunning}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Judge Model
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableJudge}
                        onChange={(e) => setEnableJudge(e.target.checked)}
                        disabled={isRunning}
                        className="rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500"
                      />
                      Enable AI Judge
                    </label>
                  </div>
                  <ModelSelector
                    label=""
                    value={judgeModel}
                    onChange={setJudgeModel}
                    disabled={isRunning || !enableJudge}
                    className={!enableJudge ? 'opacity-50' : ''}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-100">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toggles.allowPlaceholders}
                    onChange={(e) => setToggles(prev => ({ ...prev, allowPlaceholders: e.target.checked }))}
                    disabled={isRunning}
                    className="rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500"
                  />
                  Allow Placeholders
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toggles.stripMeta}
                    onChange={(e) => setToggles(prev => ({ ...prev, stripMeta: e.target.checked }))}
                    disabled={isRunning}
                    className="rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500"
                  />
                  Strip Meta Commentary
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toggles.aestheticMode}
                    onChange={(e) => setToggles(prev => ({ ...prev, aestheticMode: e.target.checked }))}
                    disabled={isRunning}
                    className="rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500"
                  />
                  Aesthetic Mode
                </label>
              </div>
            </div>
          )}
        </div>

      {/* Run Button */}
        <button
          type="button"
          onClick={handleRunExperiment}
          disabled={!canRun}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] ${
            !canRun
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-200 hover:shadow-xl'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running {progress.completed}/{progress.total}...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 text-yellow-300 fill-current" />
              Run Experiment ({totalCombos} combination{totalCombos !== 1 ? 's' : ''})
            </>
          )}
        </button>

        {isRunning && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Progress</span>
              <span className="text-slate-400">{progress.completed} / {progress.total}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 bg-cyan-400"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
        {results.length > 0 && (
          <ResultsGrid results={results} />
        )}
      </div>

      {/* History Panel */}
      {showHistory && canPersist && (
        <div className="w-80 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <History size={16} />
              Experiment History
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[600px]">
            {loadingHistory && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            )}
            
            {!loadingHistory && experiments.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No experiments yet
              </div>
            )}
            
            {!loadingHistory && experiments.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleLoadExperiment(exp.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                  currentExperimentId === exp.id
                    ? 'bg-cyan-50 border-cyan-200'
                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">
                      {exp.originalPrompt?.substring(0, 50) || 'Untitled'}
                      {exp.originalPrompt?.length > 50 ? '...' : ''}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{exp.totalCells || 0} cells</span>
                      <span>•</span>
                      <span className={
                        exp.status === 'complete' ? 'text-green-500' :
                        exp.status === 'running' ? 'text-blue-500' :
                        exp.status === 'failed' ? 'text-red-500' : ''
                      }>
                        {exp.status || 'unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {exp.createdAt?.seconds
                        ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                        : 'Just now'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteExperiment(exp.id, e)}
                    className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete experiment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
