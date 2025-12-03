/**
 * AdminPanel - Main admin panel component
 * 
 * Provides tabbed interface for organization management including
 * settings, API keys, users, and usage analytics.
 */

import { useState } from 'react';
import { 
  Settings, 
  Key, 
  Users, 
  BarChart3, 
  X,
  Shield,
  Building2
} from 'lucide-react';
import OrgSettings from './OrgSettings';
import OrgApiKeys from './OrgApiKeys';
import UserRoles from './UserRoles';

const TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'users', label: 'Users', icon: Users },
  // { id: 'usage', label: 'Usage', icon: BarChart3 }, // Phase 4
];

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the panel is visible
 * @param {Function} props.onClose - Callback to close the panel
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {Object} props.organization - Organization data
 * @param {string} props.userRole - Current user's role
 * @param {boolean} props.isAdmin - Whether user is admin or owner
 * @param {boolean} props.isOwner - Whether user is owner
 * @param {Function} props.updateSettings - Update org settings
 * @param {Function} props.updateApiKey - Update an API key
 * @param {Function} props.removeApiKey - Remove an API key
 * @param {Function} props.updateMemberRole - Update a member's role
 * @param {Function} props.removeMember - Remove a member
 * @param {Function} props.updateOrgName - Update organization name
 * @param {Object} props.user - Current user
 */
export default function AdminPanel({
  isOpen,
  onClose,
  darkMode,
  organization,
  userRole,
  isAdmin,
  isOwner,
  updateSettings,
  updateApiKey,
  removeApiKey,
  updateMemberRole,
  removeMember,
  updateOrgName,
  user,
}) {
  const [activeTab, setActiveTab] = useState('settings');

  if (!isOpen) return null;

  // Don't render if user doesn't have admin access
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 text-center ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <Shield className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            Access Denied
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            You don't have permission to access the admin panel.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <Building2 className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                Admin Panel
              </h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {organization?.name || 'Organization'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? darkMode
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-indigo-500 text-indigo-600'
                    : darkMode
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'settings' && (
            <OrgSettings
              darkMode={darkMode}
              organization={organization}
              isOwner={isOwner}
              updateSettings={updateSettings}
              updateOrgName={updateOrgName}
            />
          )}
          {activeTab === 'apikeys' && (
            <OrgApiKeys
              darkMode={darkMode}
              organization={organization}
              updateApiKey={updateApiKey}
              removeApiKey={removeApiKey}
              user={user}
            />
          )}
          {activeTab === 'users' && (
            <UserRoles
              darkMode={darkMode}
              organization={organization}
              userRole={userRole}
              isOwner={isOwner}
              updateMemberRole={updateMemberRole}
              removeMember={removeMember}
              currentUserId={user?.uid}
            />
          )}
        </div>
      </div>
    </div>
  );
}
