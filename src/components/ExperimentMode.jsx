import { useState, useEffect, useRef } from 'react';
import { Beaker, Play, Loader2, AlertCircle, Zap, Settings2, ChevronDown, ChevronUp, Layout, FileText, Database, Code, Copy, MessageSquare, XCircle } from 'lucide-react';
import MatrixSelector from './MatrixSelector';
import ModelSelector from './ModelSelector';
import ResultsGrid from './ResultsGrid';
import ExperimentSettings from './ExperimentSettings';
import { runMatrixExperiment } from '../lib/experimentRunner';
import {
  createExperiment,
  updateExperiment,
  saveExperimentResult,
  completeExperiment,
  subscribeToExperiments,
  getExperimentWithResults,
  deleteExperiment,
  subscribeToBaselines,
  saveBaselines
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
 * @param {Object} [props.firebaseApp] - Firebase app instance (for storage uploads)
 * @param {Function} [props.onHistoryChange] - Callback with history state for parent rendering
 */
export default function ExperimentMode({ callLLM, defaultOutputType = 'doc', db, user, apiKeys = {}, firebaseApp, onHistoryChange, darkMode = false }) {
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
  const abortControllerRef = useRef(null);

  // History state
  const [experiments, setExperiments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [baselines, setBaselines] = useState({});
  const [judgeOptions, setJudgeOptions] = useState({
    dualJudge: false,
    rubricEnforcement: 'standard'
  });

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

  // Subscribe to baselines
  useEffect(() => {
    if (!canPersist) return;

    const unsubscribe = subscribeToBaselines(db, user.uid, (b) => {
      setBaselines(b);
    });

    return () => unsubscribe();
  }, [db, user?.uid, canPersist]);

  // Notify parent of history state changes for sidebar rendering
  useEffect(() => {
    if (onHistoryChange) {
      onHistoryChange({
        experiments,
        loadingHistory,
        currentExperimentId,
        handleLoadExperiment,
        handleDeleteExperiment
      });
    }
  }, [experiments, loadingHistory, currentExperimentId, onHistoryChange]);

  // Save baselines and judge options handler
  const handleSaveSettings = async (newBaselines, newJudgeOptions) => {
    setJudgeOptions(newJudgeOptions);
    if (!canPersist) return;
    try {
      await saveBaselines(db, user.uid, newBaselines);
      // TODO: Save judge options to Firestore if needed
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const totalCombos = (matrixConfig.tones?.length || 0) *
    (matrixConfig.lengths?.length || 0) *
    (matrixConfig.formats?.length || 0);

  const canRun = originalPrompt.trim().length > 0 && totalCombos > 0 && !isRunning;

  const handleCancelExperiment = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setError('Experiment cancelled');
    // Mark remaining pending items as cancelled
    setResults(prev => prev.map(r => 
      r.status === 'pending' || r.status === 'running' 
        ? { ...r, status: 'cancelled', error: 'Cancelled by user' } 
        : r
    ));
  };

  const handleRunExperiment = async () => {
    if (!canRun) return;

    // Create new AbortController for this run
    abortControllerRef.current = new AbortController();

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
          apiKeys,
          baselines, // Pass baselines for anchored judging
          judgeOptions // Pass judge options for dual-judge and rubric enforcement
        },
        signal: abortControllerRef.current?.signal,
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
    { id: 'deck', label: 'Deck', icon: Layout },
    { id: 'doc', label: 'Doc', icon: FileText },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'comms', label: 'Comms', icon: MessageSquare }
  ];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="text-cyan-500" size={28} />
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Experiment Mode</h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Test prompt variations across multiple settings
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {canPersist && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title="Experiment Settings"
              >
                <Settings2 size={16} />
              </button>
            )}
          </div>
        </div>

      {/* Original Prompt Input */}
        <div className={`rounded-xl shadow-sm border p-6 transition-all focus-within:ring-2 focus-within:ring-cyan-100 focus-within:border-cyan-400 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <label className={`text-sm font-semibold mb-3 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Your Original Prompt</label>
          <textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder="e.g., Make me a deck about Andrej Karpathy software 3.0"
            className={`w-full h-32 resize-none outline-none text-sm bg-transparent ${darkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-300'}`}
            disabled={isRunning}
          />
        </div>

      {/* Output Type Selector */}
        <div>
          <label className={`text-sm font-semibold mb-3 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Output Type</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {OUTPUT_TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutputType(opt.id)}
                  disabled={isRunning}
                  className={`flex flex-col items-center justify-center p-3 min-h-[60px] rounded-lg border transition-all duration-200 ${
                    outputType === opt.id
                      ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                      : darkMode ? 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon size={20} className="mb-1" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      {/* Matrix Selector */}
        <MatrixSelector
          value={matrixConfig}
          onChange={setMatrixConfig}
          darkMode={darkMode}
        />

        {/* Advanced Settings (Model Selection) */}
        <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
          >
            <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              <Settings2 className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              Advanced Configuration
            </div>
            {showAdvanced ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
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
                  darkMode={darkMode}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Judge Model
                    </label>
                    <label className={`flex items-center gap-2 text-xs cursor-pointer ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <input
                        type="checkbox"
                        checked={enableJudge}
                        onChange={(e) => setEnableJudge(e.target.checked)}
                        disabled={isRunning}
                        className={`rounded text-cyan-500 focus:ring-cyan-500 ${darkMode ? 'border-slate-500 bg-slate-600' : 'border-slate-300 bg-white'}`}
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
                    darkMode={darkMode}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className={`flex flex-wrap gap-6 pt-4 border-t ${darkMode ? 'border-slate-600' : 'border-slate-100'}`}>
                <label className={`flex items-center gap-2 text-sm cursor-pointer ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={toggles.allowPlaceholders}
                    onChange={(e) => setToggles(prev => ({ ...prev, allowPlaceholders: e.target.checked }))}
                    disabled={isRunning}
                    className={`rounded text-cyan-500 focus:ring-cyan-500 ${darkMode ? 'border-slate-500 bg-slate-600' : 'border-slate-300 bg-white'}`}
                  />
                  Allow Placeholders
                </label>
                <label className={`flex items-center gap-2 text-sm cursor-pointer ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={toggles.stripMeta}
                    onChange={(e) => setToggles(prev => ({ ...prev, stripMeta: e.target.checked }))}
                    disabled={isRunning}
                    className={`rounded text-cyan-500 focus:ring-cyan-500 ${darkMode ? 'border-slate-500 bg-slate-600' : 'border-slate-300 bg-white'}`}
                  />
                  Strip Meta Commentary
                </label>
                <label className={`flex items-center gap-2 text-sm cursor-pointer ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={toggles.aestheticMode}
                    onChange={(e) => setToggles(prev => ({ ...prev, aestheticMode: e.target.checked }))}
                    disabled={isRunning}
                    className={`rounded text-cyan-500 focus:ring-cyan-500 ${darkMode ? 'border-slate-500 bg-slate-600' : 'border-slate-300 bg-white'}`}
                  />
                  Aesthetic Mode
                </label>
              </div>
            </div>
          )}
        </div>

      {/* Run Button (clickable to cancel when running) */}
        <button
          type="button"
          onClick={isRunning ? handleCancelExperiment : handleRunExperiment}
          disabled={!canRun && !isRunning}
          title={isRunning ? 'Click to cancel' : undefined}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] ${
            isRunning
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 cursor-pointer'
              : !canRun
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-200 hover:shadow-xl'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running {progress.completed}/{progress.total}...
              <span className="text-sm font-normal opacity-75">(click to cancel)</span>
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
              <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Progress</span>
              <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>{progress.completed} / {progress.total}</span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full transition-all duration-300 bg-cyan-400"
                style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
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
        <ResultsGrid results={results} darkMode={darkMode} />
      )}

      {/* Settings Modal */}
      <ExperimentSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        baselines={baselines}
        judgeOptions={judgeOptions}
        onSave={handleSaveSettings}
        firebaseApp={firebaseApp}
        userId={user?.uid}
        darkMode={darkMode}
      />
    </div>
  );
}
