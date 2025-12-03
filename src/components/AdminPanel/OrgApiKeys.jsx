/**
 * OrgApiKeys - Organization API key management
 * 
 * Allows admins to add, test, and remove API keys for each provider.
 */

import { useState } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { testApiKey, maskApiKey } from '../../lib/keyTester';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-proj-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
];

/**
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {Object} props.organization - Organization data
 * @param {Function} props.updateApiKey - Update an API key
 * @param {Function} props.removeApiKey - Remove an API key
 * @param {Object} props.user - Current user
 */
export default function OrgApiKeys({
  darkMode,
  organization,
  updateApiKey,
  removeApiKey,
  user,
}) {
  const [editingKey, setEditingKey] = useState(null); // provider id being edited
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [saving, setSaving] = useState(false);

  const apiKeys = organization?.apiKeys || {};

  const handleTestKey = async (provider, key) => {
    setTesting(prev => ({ ...prev, [provider]: true }));
    setTestResults(prev => ({ ...prev, [provider]: null }));
    
    try {
      const result = await testApiKey(provider, key);
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: { valid: false, error: error.message } 
      }));
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSaveKey = async (provider) => {
    if (!newKeyValue.trim()) return;
    
    setSaving(true);
    try {
      // Test the key first
      const result = await testApiKey(provider, newKeyValue);
      
      await updateApiKey(provider, {
        key: newKeyValue,
        testStatus: result.valid ? 'valid' : 'invalid',
        lastTestedAt: new Date(),
      });
      
      setTestResults(prev => ({ ...prev, [provider]: result }));
      setEditingKey(null);
      setNewKeyValue('');
    } catch (error) {
      console.error('Failed to save API key:', error);
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: { valid: false, error: 'Failed to save key' } 
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async (provider) => {
    if (!confirm(`Remove ${PROVIDERS.find(p => p.id === provider)?.name} API key?`)) {
      return;
    }
    
    try {
      await removeApiKey(provider);
      setTestResults(prev => ({ ...prev, [provider]: null }));
    } catch (error) {
      console.error('Failed to remove API key:', error);
    }
  };

  const getStatusIcon = (provider) => {
    const keyData = apiKeys[provider];
    const testResult = testResults[provider];
    
    if (testing[provider]) {
      return <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />;
    }
    
    if (testResult) {
      return testResult.valid 
        ? <CheckCircle className="w-4 h-4 text-green-500" />
        : <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    if (keyData?.testStatus === 'valid') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (keyData?.testStatus === 'invalid') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    return <AlertCircle className="w-4 h-4 text-slate-400" />;
  };

  const cardClass = `rounded-lg p-4 border ${
    darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
  }`;

  const inputClass = `flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
    darkMode 
      ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' 
      : 'border-slate-200 bg-white text-slate-800'
  }`;

  const buttonClass = `p-2 rounded-lg transition-colors ${
    darkMode 
      ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-200' 
      : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'
  }`;

  return (
    <div className="space-y-4">
      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Manage API keys for your organization. All members will have access to these keys.
      </p>

      {PROVIDERS.map((provider) => {
        const keyData = apiKeys[provider.id];
        const hasKey = !!keyData?.key;
        const isEditing = editingKey === provider.id;
        const testResult = testResults[provider.id];

        return (
          <div key={provider.id} className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {provider.name}
                </span>
                {getStatusIcon(provider.id)}
              </div>
              
              {hasKey && !isEditing && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTestKey(provider.id, keyData.key)}
                    disabled={testing[provider.id]}
                    className={buttonClass}
                    title="Test key"
                  >
                    <RefreshCw className={`w-4 h-4 ${testing[provider.id] ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingKey(provider.id);
                      setNewKeyValue(keyData.key);
                    }}
                    className={buttonClass}
                    title="Edit key"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveKey(provider.id)}
                    className={`${buttonClass} hover:text-red-500`}
                    title="Remove key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey[provider.id] ? 'text' : 'password'}
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      placeholder={provider.placeholder}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {showKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEditingKey(null);
                      setNewKeyValue('');
                    }}
                    className={`text-sm ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestKey(provider.id, newKeyValue)}
                      disabled={!newKeyValue.trim() || testing[provider.id]}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        darkMode 
                          ? 'bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50'
                      }`}
                    >
                      {testing[provider.id] ? 'Testing...' : 'Test Key'}
                    </button>
                    <button
                      onClick={() => handleSaveKey(provider.id)}
                      disabled={!newKeyValue.trim() || saving}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                {testResult && (
                  <div className={`text-sm flex items-center gap-1 ${testResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                    {testResult.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {testResult.valid ? 'Key is valid' : testResult.error}
                  </div>
                )}
              </div>
            ) : hasKey ? (
              <div>
                <div className={`font-mono text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {maskApiKey(keyData.key)}
                </div>
                {keyData.addedAt && (
                  <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Added {new Date(keyData.addedAt?.seconds * 1000 || keyData.addedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingKey(provider.id);
                  setNewKeyValue('');
                }}
                className={`flex items-center gap-2 text-sm ${
                  darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add API Key
              </button>
            )}
          </div>
        );
      })}

      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        API keys are stored securely and never exposed to other users.
      </p>
    </div>
  );
}
