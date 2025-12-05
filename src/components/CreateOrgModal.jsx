/**
 * CreateOrgModal - Modal for creating a new organization
 */

import { useState } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';

export default function CreateOrgModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  darkMode = false 
}) {
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    if (orgName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await onCreate(orgName.trim());
      setOrgName('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-xl shadow-xl ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <Building2 className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Create Organization
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              darkMode 
                ? 'hover:bg-slate-700 text-slate-400' 
                : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Create a new organization to collaborate with your team. You'll be the owner and can invite others.
          </p>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Acme Corp"
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-2 p-4 border-t ${
          darkMode ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <button
            onClick={onClose}
            disabled={isCreating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'hover:bg-slate-700 text-slate-300'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !orgName.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isCreating || !orgName.trim()
                ? 'bg-indigo-400 cursor-not-allowed text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </div>
    </div>
  );
}
