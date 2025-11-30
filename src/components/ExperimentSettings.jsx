import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Save, Upload, File, Image, AlertCircle, Loader2, Settings, Users, Shield } from 'lucide-react';
import { 
  CONTENT_TYPES, 
  OUTPUT_TYPE_CONTENT_TYPES, 
  uploadBaselineFile, 
  deleteBaselineFile,
  readFileAsText,
  requiresVision 
} from '../lib/storageService';
import { OUTPUT_TYPES } from '../lib/constants';

/**
 * Default judge options
 */
const DEFAULT_JUDGE_OPTIONS = {
  dualJudge: false,        // Use two judges (Strict + Style) and average
  rubricEnforcement: 'standard' // 'standard', 'strict', 'lenient'
};

/**
 * ExperimentSettings – Modal for managing baseline examples and judge options.
 * Supports text, markdown, CSV, HTML, PDF, and image uploads.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.baselines - Current baselines object
 * @param {Object} props.judgeOptions - Current judge options { dualJudge, rubricEnforcement }
 * @param {Function} props.onSave - Callback to save baselines and judge options
 * @param {Object} props.firebaseApp - Firebase app instance for storage
 * @param {string} props.userId - Current user ID
 */
export default function ExperimentSettings({ isOpen, onClose, baselines = {}, judgeOptions = {}, onSave, firebaseApp, userId, darkMode = false }) {
  const [activeTab, setActiveTab] = useState('deck');
  const [activeSection, setActiveSection] = useState('baselines'); // 'baselines' or 'options'
  const [localBaselines, setLocalBaselines] = useState({});
  const [localJudgeOptions, setLocalJudgeOptions] = useState(DEFAULT_JUDGE_OPTIONS);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState(null); // index of uploading example
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalBaselines(JSON.parse(JSON.stringify(baselines)));
      setLocalJudgeOptions({ ...DEFAULT_JUDGE_OPTIONS, ...judgeOptions });
      setHasChanges(false);
    }
  }, [isOpen, baselines, judgeOptions]);

  if (!isOpen) return null;

  const currentExamples = localBaselines[activeTab] || [];
  const allowedContentTypes = OUTPUT_TYPE_CONTENT_TYPES[activeTab] || ['text'];
  const defaultContentType = allowedContentTypes[0];

  const addExample = () => {
    const updated = {
      ...localBaselines,
      [activeTab]: [
        ...currentExamples,
        { 
          score: 7, 
          label: `Example ${currentExamples.length + 1}`, 
          content: '',
          contentType: defaultContentType,
          // File-specific fields (optional)
          fileUrl: null,
          fileName: null,
          filePath: null
        }
      ]
    };
    setLocalBaselines(updated);
    setHasChanges(true);
  };

  const updateExample = (index, field, value) => {
    const updated = {
      ...localBaselines,
      [activeTab]: currentExamples.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    };
    setLocalBaselines(updated);
    setHasChanges(true);
  };

  const deleteExample = async (index) => {
    const example = currentExamples[index];
    // Delete file from storage if exists
    if (example.filePath && firebaseApp) {
      try {
        await deleteBaselineFile(firebaseApp, example.filePath);
      } catch (err) {
        console.warn('Failed to delete file:', err);
      }
    }
    const updated = {
      ...localBaselines,
      [activeTab]: currentExamples.filter((_, i) => i !== index)
    };
    setLocalBaselines(updated);
    setHasChanges(true);
  };

  const handleFileUpload = async (index, file) => {
    if (!firebaseApp || !userId) {
      setUploadError('Firebase not configured for file uploads');
      return;
    }

    setUploading(index);
    setUploadError(null);

    try {
      // For text-based files, read content directly
      const textExtensions = ['.txt', '.md', '.csv', '.html', '.json', '.xml'];
      const isTextFile = textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (isTextFile || file.type.startsWith('text/')) {
        const content = await readFileAsText(file);
        updateExample(index, 'content', content);
        updateExample(index, 'fileName', file.name);
        // Determine content type from file extension
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.md')) {
          updateExample(index, 'contentType', 'markdown');
        } else if (lowerName.endsWith('.csv')) {
          updateExample(index, 'contentType', 'csv');
        } else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
          updateExample(index, 'contentType', 'html');
        } else if (lowerName.endsWith('.json')) {
          updateExample(index, 'contentType', 'text');
        }
      } else {
        // Upload binary files (PDF, images)
        const result = await uploadBaselineFile(firebaseApp, userId, activeTab, file);
        const updated = {
          ...localBaselines,
          [activeTab]: currentExamples.map((ex, i) => 
            i === index ? { 
              ...ex, 
              fileUrl: result.url,
              fileName: result.fileName,
              filePath: result.path,
              contentType: result.contentType,
              content: '' // Clear text content for file uploads
            } : ex
          )
        };
        setLocalBaselines(updated);
        setHasChanges(true);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = () => {
    onSave(localBaselines, localJudgeOptions);
    setHasChanges(false);
    onClose();
  };

  const updateJudgeOption = (key, value) => {
    setLocalJudgeOptions(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'pdf': return File;
      case 'image': return Image;
      default: return FileText;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 6) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Experiment Settings</h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Configure baseline examples for calibrated judging
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className={`w-48 border-r p-4 space-y-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
            {/* Baselines Section */}
            <div>
              <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Baseline Examples
              </div>
              {OUTPUT_TYPES.map(type => {
                const Icon = type.icon;
                const count = (localBaselines[type.id] || []).length;
                const isActive = activeSection === 'baselines' && activeTab === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => { setActiveSection('baselines'); setActiveTab(type.id); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{type.label}</span>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-cyan-200 text-cyan-800' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            {/* Judge Options Section */}
            <div>
              <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Judge Options
              </div>
              <button
                onClick={() => setActiveSection('options')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === 'options'
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings size={16} />
                <span className="flex-1 text-left">Advanced</span>
              </button>
            </div>
          </div>

          {/* Baselines Panel (Right) */}
          {activeSection === 'baselines' && (
          <div className={`flex-1 p-6 overflow-y-auto ${darkMode ? 'bg-slate-800' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {OUTPUT_TYPES.find(t => t.id === activeTab)?.label} Baselines
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Provide reference examples to anchor the judge's scoring. Score 7 = baseline quality.
                </p>
              </div>
              <button
                onClick={addExample}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors whitespace-nowrap"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} />
                {uploadError}
              </div>
            )}

            {currentExamples.length === 0 ? (
              <div className={`text-center py-12 border-2 border-dashed rounded-xl ${darkMode ? 'text-slate-500 border-slate-600' : 'text-slate-400 border-slate-200'}`}>
                <p className="mb-2">No baseline examples for this output type.</p>
                <p className="text-sm">The judge will proceed without anchored scoring.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentExamples.map((example, index) => {
                  const ContentIcon = getContentTypeIcon(example.contentType);
                  const isFileType = requiresVision(example.contentType);
                  const isUploading = uploading === index;

                  return (
                    <div
                      key={index}
                      className={`border rounded-xl p-4 shadow-sm ${darkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex items-start gap-4 mb-3">
                        {/* Score Input */}
                        <div className="flex flex-col items-center">
                          <label className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Score</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={example.score}
                            onChange={(e) => updateExample(index, 'score', parseInt(e.target.value) || 0)}
                            className={`w-16 text-center text-lg font-bold border rounded-lg py-1 ${getScoreColor(example.score)}`}
                          />
                        </div>

                        {/* Label Input */}
                        <div className="flex-1">
                          <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Label</label>
                          <input
                            type="text"
                            value={example.label || ''}
                            onChange={(e) => updateExample(index, 'label', e.target.value)}
                            placeholder="e.g., 'Good email with minor issues'"
                            className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200 placeholder:text-slate-400' : 'border-slate-200'}`}
                          />
                        </div>

                        {/* Content Type Selector */}
                        <div>
                          <label className={`text-xs mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Type</label>
                          <select
                            value={example.contentType || defaultContentType}
                            onChange={(e) => updateExample(index, 'contentType', e.target.value)}
                            className={`px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200' : 'border-slate-200'}`}
                          >
                            {allowedContentTypes.map(type => (
                              <option key={type} value={type}>
                                {CONTENT_TYPES[type]?.label || type}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteExample(index)}
                          className={`p-2 rounded-lg transition-colors mt-4 ${darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Content Area - varies by type */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`text-xs flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <ContentIcon size={12} />
                            Example Content
                          </label>
                          {/* File Upload Button */}
                          <label className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-600 hover:bg-cyan-50 rounded cursor-pointer transition-colors">
                            <Upload size={12} />
                            {isUploading ? 'Uploading...' : 'Upload File'}
                            <input
                              type="file"
                              className="hidden"
                              accept={isFileType ? '.pdf,image/*' : '.txt,.md,.csv,.html'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(index, file);
                                e.target.value = '';
                              }}
                              disabled={isUploading}
                            />
                          </label>
                        </div>

                        {/* Show file info if uploaded */}
                        {example.fileUrl ? (
                          <div className={`flex items-center gap-3 p-3 rounded-lg border ${darkMode ? 'bg-slate-600 border-slate-500' : 'bg-slate-50 border-slate-200'}`}>
                            <ContentIcon size={24} className={darkMode ? 'text-slate-400' : 'text-slate-400'} />
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{example.fileName}</div>
                              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {example.contentType === 'pdf' ? 'PDF Document' : 'Image'} • Uploaded
                              </div>
                            </div>
                            <a
                              href={example.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-600 hover:underline"
                            >
                              View
                            </a>
                          </div>
                        ) : (
                          <textarea
                            value={example.content || ''}
                            onChange={(e) => updateExample(index, 'content', e.target.value)}
                            placeholder={
                              example.contentType === 'csv' 
                                ? 'Paste CSV data or upload a file...'
                                : example.contentType === 'html'
                                ? 'Paste HTML content or upload a file...'
                                : 'Paste an example output that represents this score level...'
                            }
                            rows={4}
                            className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200 placeholder:text-slate-400' : 'border-slate-200'}`}
                          />
                        )}

                        {/* Vision warning */}
                        {requiresVision(example.contentType) && (
                          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Requires vision-capable judge model (Gemini, GPT-4o, Claude 3)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

          {/* Judge Options Panel */}
          {activeSection === 'options' && (
            <div className={`flex-1 p-6 overflow-y-auto ${darkMode ? 'bg-slate-800' : ''}`}>
              <div className="mb-6">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Advanced Judge Options</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Configure how the AI judge evaluates outputs.
                </p>
              </div>

              <div className="space-y-6">
                {/* Dual Judge Committee */}
                <div className={`border rounded-xl p-4 ${darkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                      <Users size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Dual-Judge Committee</h4>
                        <button
                          onClick={() => updateJudgeOption('dualJudge', !localJudgeOptions.dualJudge)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            localJudgeOptions.dualJudge ? 'bg-purple-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            localJudgeOptions.dualJudge ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                      </div>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Use two independent judges with different perspectives and average their scores.
                      </p>
                      <div className={`mt-3 text-xs space-y-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Judge A (Strict):</span>
                          <span>Focuses on accuracy, completeness, and technical correctness</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Judge B (Style):</span>
                          <span>Focuses on readability, tone, and user experience</span>
                        </div>
                      </div>
                      {localJudgeOptions.dualJudge && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                          <AlertCircle size={14} />
                          This will double API costs for judging
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rubric Enforcement Mode */}
                <div className={`border rounded-xl p-4 ${darkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                      <Shield size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Rubric Enforcement Mode</h4>
                      <p className={`text-sm mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Control how strictly the judge applies the scoring rubric.
                      </p>
                      <div className="space-y-2">
                        {[
                          { id: 'lenient', label: 'Lenient', desc: 'More forgiving, focuses on overall intent' },
                          { id: 'standard', label: 'Standard', desc: 'Balanced evaluation (recommended)' },
                          { id: 'strict', label: 'Strict', desc: 'Rigorous adherence to all criteria' }
                        ].map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => updateJudgeOption('rubricEnforcement', mode.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                              localJudgeOptions.rubricEnforcement === mode.id
                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                : darkMode ? 'bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              localJudgeOptions.rubricEnforcement === mode.id
                                ? 'border-blue-500'
                                : darkMode ? 'border-slate-500' : 'border-slate-300'
                            }`}>
                              {localJudgeOptions.rubricEnforcement === mode.id && (
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{mode.label}</div>
                              <div className={`text-xs ${localJudgeOptions.rubricEnforcement === mode.id ? '' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{mode.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {hasChanges ? (
              <span className="text-amber-600">You have unsaved changes</span>
            ) : (
              'Changes are saved to your account'
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasChanges
                  ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                  : darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
