/**
 * InviteManager - Manage organization invites
 * 
 * Allows admins to create, view, and delete invite codes.
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  Clock, 
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createInvite, getOrgInvites, deleteInvite } from '../../lib/orgMembershipService';

export default function InviteManager({ 
  darkMode, 
  organization, 
  user,
  db 
}) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [error, setError] = useState('');

  // New invite form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState('member');
  const [newInviteMaxUses, setNewInviteMaxUses] = useState(0);
  const [newInviteExpiry, setNewInviteExpiry] = useState(7);

  // Load invites
  useEffect(() => {
    if (!db || !organization?.id) {
      setLoading(false);
      return;
    }

    const loadInvites = async () => {
      setLoading(true);
      try {
        const orgInvites = await getOrgInvites(db, organization.id);
        setInvites(orgInvites);
      } catch (err) {
        console.error('Error loading invites:', err);
        setError('Failed to load invites');
      } finally {
        setLoading(false);
      }
    };

    loadInvites();
  }, [db, organization?.id]);

  // Create new invite
  const handleCreateInvite = async () => {
    if (!db || !organization?.id || !user?.uid) return;

    setCreating(true);
    setError('');

    try {
      const invite = await createInvite(
        db, 
        organization.id, 
        user.uid, 
        newInviteRole, 
        newInviteMaxUses, 
        newInviteExpiry
      );
      
      setInvites(prev => [{ ...invite, active: true }, ...prev]);
      setShowCreateForm(false);
      
      // Reset form
      setNewInviteRole('member');
      setNewInviteMaxUses(0);
      setNewInviteExpiry(7);
    } catch (err) {
      setError('Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  // Delete invite
  const handleDeleteInvite = async (code) => {
    if (!db) return;

    try {
      await deleteInvite(db, code);
      setInvites(prev => prev.filter(i => i.code !== code));
    } catch (err) {
      setError('Failed to delete invite');
    }
  };

  // Copy invite code
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            Invite Links
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Create invite codes to add members to your organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Invite
        </button>
      </div>

      {error && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Create Invite Form */}
      {showCreateForm && (
        <div className={`p-4 rounded-lg border ${
          darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`font-medium mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            New Invite
          </h4>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Role
              </label>
              <select
                value={newInviteRole}
                onChange={(e) => setNewInviteRole(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Max Uses
              </label>
              <select
                value={newInviteMaxUses}
                onChange={(e) => setNewInviteMaxUses(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value={0}>Unlimited</option>
                <option value={1}>1 use</option>
                <option value={5}>5 uses</option>
                <option value={10}>10 uses</option>
                <option value={25}>25 uses</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Expires In
              </label>
              <select
                value={newInviteExpiry}
                onChange={(e) => setNewInviteExpiry(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={0}>Never</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                darkMode
                  ? 'text-slate-300 hover:bg-slate-600'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvite}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Invites List */}
      <div className="space-y-2">
        {invites.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No invite codes yet</p>
            <p className="text-sm">Create one to start inviting members</p>
          </div>
        ) : (
          invites.map((invite) => (
            <div
              key={invite.code}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                invite.active
                  ? darkMode
                    ? 'bg-slate-700/30 border-slate-600'
                    : 'bg-white border-slate-200'
                  : darkMode
                    ? 'bg-slate-800/50 border-slate-700 opacity-60'
                    : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Code */}
                <div className="flex items-center gap-2">
                  <code className={`font-mono text-lg font-bold tracking-wider ${
                    darkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`}>
                    {invite.code}
                  </code>
                  <button
                    onClick={() => handleCopyCode(invite.code)}
                    className={`p-1.5 rounded transition-colors ${
                      darkMode
                        ? 'hover:bg-slate-600 text-slate-400'
                        : 'hover:bg-slate-100 text-slate-500'
                    }`}
                    title="Copy code"
                  >
                    {copiedCode === invite.code ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Details */}
                <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                    invite.role === 'admin'
                      ? darkMode
                        ? 'bg-amber-900/50 text-amber-400'
                        : 'bg-amber-100 text-amber-700'
                      : darkMode
                        ? 'bg-slate-600 text-slate-300'
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {invite.role}
                  </span>
                  <span className="mr-2">
                    {invite.uses}/{invite.maxUses || '∞'} uses
                  </span>
                  {invite.expiresAt && (
                    <span className="flex items-center gap-1 inline-flex">
                      <Clock className="w-3 h-3" />
                      {formatDate(invite.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-2">
                {!invite.active && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    invite.expired
                      ? darkMode
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-red-100 text-red-600'
                      : darkMode
                        ? 'bg-slate-600 text-slate-300'
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {invite.expired ? 'Expired' : 'Used up'}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteInvite(invite.code)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400'
                      : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                  }`}
                  title="Delete invite"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
