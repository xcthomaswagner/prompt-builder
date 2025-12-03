/**
 * OrgSettings - Organization settings management
 * 
 * Allows admins to configure organization name, API key policies,
 * default provider, and usage alerts.
 */

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {Object} props.organization - Organization data
 * @param {boolean} props.isOwner - Whether user is owner
 * @param {Function} props.updateSettings - Update org settings
 * @param {Function} props.updateOrgName - Update organization name
 */
export default function OrgSettings({
  darkMode,
  organization,
  isOwner,
  updateSettings,
  updateOrgName,
}) {
  const [orgName, setOrgName] = useState('');
  const [settings, setSettings] = useState({
    allowUserKeys: true,
    requireOrgKeys: false,
    defaultProvider: 'gemini',
    usageAlerts: {
      enabled: true,
      warnThreshold: 0.20,
      criticalThreshold: 0.10,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from organization data
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setSettings({
        allowUserKeys: organization.settings?.allowUserKeys ?? true,
        requireOrgKeys: organization.settings?.requireOrgKeys ?? false,
        defaultProvider: organization.settings?.defaultProvider || 'gemini',
        usageAlerts: {
          enabled: organization.settings?.usageAlerts?.enabled ?? true,
          warnThreshold: organization.settings?.usageAlerts?.warnThreshold ?? 0.20,
          criticalThreshold: organization.settings?.usageAlerts?.criticalThreshold ?? 0.10,
        },
      });
      setHasChanges(false);
    }
  }, [organization]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveStatus(null);
  };

  const handleAlertChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      usageAlerts: { ...prev.usageAlerts, [key]: value },
    }));
    setHasChanges(true);
    setSaveStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    
    try {
      // Update name if changed
      if (orgName !== organization?.name) {
        await updateOrgName(orgName);
      }
      
      // Update settings
      await updateSettings(settings);
      
      setSaveStatus('success');
      setHasChanges(false);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
    darkMode 
      ? 'bg-slate-700 border-slate-600 text-slate-200' 
      : 'border-slate-200 bg-white text-slate-800'
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    darkMode ? 'text-slate-300' : 'text-slate-700'
  }`;

  const cardClass = `rounded-lg p-4 border ${
    darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
  }`;

  return (
    <div className="space-y-6">
      {/* Organization Name */}
      <div className={cardClass}>
        <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          Organization Details
        </h3>
        <div>
          <label className={labelClass}>Organization Name</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              setHasChanges(true);
              setSaveStatus(null);
            }}
            placeholder="My Organization"
            className={inputClass}
          />
        </div>
      </div>

      {/* API Key Policy */}
      <div className={cardClass}>
        <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          API Key Policy
        </h3>
        <div className="space-y-3">
          <label className={`flex items-start gap-3 cursor-pointer ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <input
              type="radio"
              name="keyPolicy"
              checked={settings.allowUserKeys && !settings.requireOrgKeys}
              onChange={() => {
                handleSettingChange('allowUserKeys', true);
                handleSettingChange('requireOrgKeys', false);
              }}
              className="mt-1"
            />
            <div>
              <span className="font-medium">Allow personal API keys</span>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Members can use their own API keys alongside organization keys
              </p>
            </div>
          </label>
          
          <label className={`flex items-start gap-3 cursor-pointer ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <input
              type="radio"
              name="keyPolicy"
              checked={settings.requireOrgKeys}
              onChange={() => {
                handleSettingChange('allowUserKeys', false);
                handleSettingChange('requireOrgKeys', true);
              }}
              className="mt-1"
            />
            <div>
              <span className="font-medium">Organization keys only</span>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Enterprise mode: all members must use organization API keys
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Default Provider */}
      <div className={cardClass}>
        <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          Default LLM Provider
        </h3>
        <select
          value={settings.defaultProvider}
          onChange={(e) => handleSettingChange('defaultProvider', e.target.value)}
          className={inputClass}
        >
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic Claude</option>
        </select>
        <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Default provider for new users in this organization
        </p>
      </div>

      {/* Usage Alerts */}
      <div className={cardClass}>
        <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          Usage Alerts
        </h3>
        <div className="space-y-4">
          <label className={`flex items-center gap-3 cursor-pointer ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <input
              type="checkbox"
              checked={settings.usageAlerts.enabled}
              onChange={(e) => handleAlertChange('enabled', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="font-medium">Enable low credit alerts</span>
          </label>
          
          {settings.usageAlerts.enabled && (
            <div className="grid grid-cols-2 gap-4 pl-7">
              <div>
                <label className={labelClass}>Warn at (% remaining)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={Math.round(settings.usageAlerts.warnThreshold * 100)}
                  onChange={(e) => handleAlertChange('warnThreshold', parseInt(e.target.value) / 100)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Critical at (% remaining)</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={Math.round(settings.usageAlerts.criticalThreshold * 100)}
                  onChange={(e) => handleAlertChange('criticalThreshold', parseInt(e.target.value) / 100)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-500">
              <CheckCircle className="w-4 h-4" />
              Settings saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              Failed to save
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
            hasChanges
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : darkMode
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
