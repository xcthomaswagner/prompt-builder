import { useState } from 'react';
import { Settings2, RefreshCw, CheckCircle, XCircle, Building2, User } from 'lucide-react';
import { OPENAI_MODELS, CLAUDE_MODELS, GEMINI_MODELS } from '../lib/llmService';
import { testApiKey } from '../lib/keyTester';

/**
 * SettingsModal - Modal for configuring API provider, keys, and models.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {string} props.selectedProvider - Current provider ('chatgpt', 'claude', 'gemini')
 * @param {Function} props.setSelectedProvider - Provider setter
 * @param {string} props.chatgptApiKey - OpenAI API key
 * @param {Function} props.setChatgptApiKey - OpenAI key setter
 * @param {string} props.claudeApiKey - Claude API key
 * @param {Function} props.setClaudeApiKey - Claude key setter
 * @param {string} props.geminiApiKey - Gemini API key
 * @param {Function} props.setGeminiApiKey - Gemini key setter
 * @param {string} props.selectedOpenAIModel - Selected OpenAI model
 * @param {Function} props.setSelectedOpenAIModel - OpenAI model setter
 * @param {string} props.selectedClaudeModel - Selected Claude model
 * @param {Function} props.setSelectedClaudeModel - Claude model setter
 * @param {string} props.selectedGeminiModel - Selected Gemini model
 * @param {Function} props.setSelectedGeminiModel - Gemini model setter
 * @param {Object} [props.keySourceInfo] - Source info for each provider key
 */
export default function SettingsModal({
  isOpen,
  onClose,
  darkMode,
  selectedProvider,
  setSelectedProvider,
  chatgptApiKey,
  setChatgptApiKey,
  claudeApiKey,
  setClaudeApiKey,
  geminiApiKey,
  setGeminiApiKey,
  selectedOpenAIModel,
  setSelectedOpenAIModel,
  selectedClaudeModel,
  setSelectedClaudeModel,
  selectedGeminiModel,
  setSelectedGeminiModel,
  keySourceInfo = {},
}) {
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});

  if (!isOpen) return null;

  // Map provider names to API key service names
  const providerMap = {
    chatgpt: 'openai',
    claude: 'anthropic',
    gemini: 'gemini',
  };

  // Get current key for selected provider
  const getCurrentKey = () => {
    switch (selectedProvider) {
      case 'chatgpt': return chatgptApiKey;
      case 'claude': return claudeApiKey;
      default: return geminiApiKey;
    }
  };

  // Handle key test
  const handleTestKey = async () => {
    const provider = providerMap[selectedProvider];
    const key = getCurrentKey();
    
    if (!key) return;
    
    setTesting(prev => ({ ...prev, [selectedProvider]: true }));
    setTestResults(prev => ({ ...prev, [selectedProvider]: null }));
    
    try {
      const result = await testApiKey(provider, key);
      setTestResults(prev => ({ ...prev, [selectedProvider]: result }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [selectedProvider]: { valid: false, error: error.message } 
      }));
    } finally {
      setTesting(prev => ({ ...prev, [selectedProvider]: false }));
    }
  };

  // Get key source for current provider
  const currentKeySource = keySourceInfo[providerMap[selectedProvider]];

  // Render key source badge
  const renderKeySourceBadge = () => {
    if (!currentKeySource) return null;
    
    const isOrg = currentKeySource === 'org';
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        isOrg 
          ? darkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
          : darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
      }`}>
        {isOrg ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
        {isOrg ? 'Org Key' : 'Personal'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <Settings2 className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Settings</h2>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* AI Provider Selection */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Provider</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedProvider('chatgpt')}
                className={`py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium ${selectedProvider === 'chatgpt'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : darkMode ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
              >
                OpenAI
              </button>
              <button
                onClick={() => setSelectedProvider('claude')}
                className={`py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium ${selectedProvider === 'claude'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : darkMode ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
              >
                Claude
              </button>
              <button
                onClick={() => setSelectedProvider('gemini')}
                className={`py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium ${selectedProvider === 'gemini'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : darkMode ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
              >
                Gemini
              </button>
            </div>
          </div>

          {/* Dynamic settings for selected provider */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>API Key</label>
                {renderKeySourceBadge()}
              </div>
              <div className="flex gap-2">
                {selectedProvider === 'chatgpt' && (
                  <input
                    type="password"
                    value={chatgptApiKey}
                    onChange={(e) => setChatgptApiKey(e.target.value)}
                    placeholder="sk-..."
                    className={`flex-1 px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white'}`}
                  />
                )}
                {selectedProvider === 'claude' && (
                  <input
                    type="password"
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className={`flex-1 px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white'}`}
                  />
                )}
                {selectedProvider === 'gemini' && (
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                    className={`flex-1 px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white'}`}
                  />
                )}
                <button
                  onClick={handleTestKey}
                  disabled={!getCurrentKey() || testing[selectedProvider]}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    !getCurrentKey()
                      ? darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Test API key"
                >
                  {testing[selectedProvider] ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : testResults[selectedProvider]?.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : testResults[selectedProvider]?.valid === false ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Test
                </button>
              </div>
              {testResults[selectedProvider] && (
                <p className={`text-xs ${testResults[selectedProvider].valid ? 'text-green-500' : 'text-red-500'}`}>
                  {testResults[selectedProvider].valid ? 'Key is valid' : testResults[selectedProvider].error || 'Key is invalid'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Model</label>
              {selectedProvider === 'chatgpt' && (
                <select
                  value={selectedOpenAIModel}
                  onChange={(e) => setSelectedOpenAIModel(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-slate-200 bg-white'}`}
                >
                  {OPENAI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
              {selectedProvider === 'claude' && (
                <select
                  value={selectedClaudeModel}
                  onChange={(e) => setSelectedClaudeModel(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-slate-200 bg-white'}`}
                >
                  {CLAUDE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
              {selectedProvider === 'gemini' && (
                <select
                  value={selectedGeminiModel}
                  onChange={(e) => setSelectedGeminiModel(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-slate-200 bg-white'}`}
                >
                  {GEMINI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Info */}
          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            API keys are stored locally and never sent to our servers.
          </p>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
