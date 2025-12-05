/**
 * JoinOrgModal - Modal for joining an organization via invite code
 */

import { useState } from 'react';
import { X, UserPlus, Loader2, CheckCircle } from 'lucide-react';

export default function JoinOrgModal({ 
  isOpen, 
  onClose, 
  onJoin, 
  darkMode = false 
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    
    if (!code) {
      setError('Invite code is required');
      return;
    }

    if (code.length !== 8) {
      setError('Invite code should be 8 characters');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const result = await onJoin(code);
      
      if (result.success) {
        setSuccess(result);
        setTimeout(() => {
          setInviteCode('');
          setSuccess(null);
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Failed to join organization');
      }
    } catch (err) {
      setError(err.message || 'Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isJoining) {
      handleJoin();
    }
  };

  // Format input as uppercase
  const handleInputChange = (e) => {
    setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
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
            <UserPlus className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Join Organization
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
          {success ? (
            <div className={`flex flex-col items-center py-6 ${
              darkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              <CheckCircle className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium">Joined successfully!</p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Welcome to {success.orgName}
              </p>
            </div>
          ) : (
            <>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Enter the invite code you received to join an organization.
              </p>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXXXXXX"
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono tracking-wider text-center uppercase transition-colors ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-indigo-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  autoFocus
                  maxLength={8}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className={`flex justify-end gap-2 p-4 border-t ${
            darkMode ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <button
              onClick={onClose}
              disabled={isJoining}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isJoining || inviteCode.length !== 8}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isJoining || inviteCode.length !== 8
                  ? 'bg-indigo-400 cursor-not-allowed text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isJoining && <Loader2 className="w-4 h-4 animate-spin" />}
              {isJoining ? 'Joining...' : 'Join Organization'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
