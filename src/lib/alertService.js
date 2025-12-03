/**
 * Alert Service - Usage and balance alerts
 * 
 * Monitors usage thresholds and balance levels to generate alerts.
 * Supports configurable thresholds and notification preferences.
 * 
 * @module lib/alertService
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @typedef {Object} Alert
 * @property {string} id - Unique alert ID
 * @property {'usage' | 'balance' | 'key'} type - Alert type
 * @property {'warning' | 'critical'} severity - Alert severity
 * @property {string} title - Alert title
 * @property {string} message - Alert message
 * @property {string} [provider] - Provider if applicable
 * @property {Date} createdAt - When alert was created
 * @property {boolean} dismissed - Whether alert has been dismissed
 */

/**
 * @typedef {Object} AlertSettings
 * @property {boolean} enabled - Whether alerts are enabled
 * @property {number} monthlyBudget - Monthly budget threshold in USD
 * @property {number} warningThreshold - Warning at this % of budget
 * @property {number} criticalThreshold - Critical at this % of budget
 * @property {number} balanceWarning - Balance warning threshold in USD
 * @property {number} balanceCritical - Balance critical threshold in USD
 */

/**
 * Default alert settings
 */
export const DEFAULT_ALERT_SETTINGS = {
  enabled: true,
  monthlyBudget: 100,
  warningThreshold: 80, // 80% of budget
  criticalThreshold: 95, // 95% of budget
  balanceWarning: 10, // $10
  balanceCritical: 5, // $5
};

/**
 * Alert type definitions
 */
export const ALERT_TYPES = {
  USAGE_WARNING: 'usage_warning',
  USAGE_CRITICAL: 'usage_critical',
  BALANCE_WARNING: 'balance_warning',
  BALANCE_CRITICAL: 'balance_critical',
  KEY_INVALID: 'key_invalid',
  KEY_EXPIRING: 'key_expiring',
};

/**
 * Check usage against budget thresholds
 * 
 * @param {number} currentCost - Current month's cost
 * @param {AlertSettings} settings - Alert settings
 * @returns {Alert|null} Alert if threshold exceeded
 */
export function checkUsageAlert(currentCost, settings) {
  if (!settings?.enabled || !settings?.monthlyBudget) return null;

  const percentUsed = (currentCost / settings.monthlyBudget) * 100;

  if (percentUsed >= settings.criticalThreshold) {
    return {
      id: `usage_critical_${Date.now()}`,
      type: 'usage',
      severity: 'critical',
      title: 'Usage Critical',
      message: `You've used ${percentUsed.toFixed(0)}% of your monthly budget ($${currentCost.toFixed(2)} of $${settings.monthlyBudget})`,
      createdAt: new Date(),
      dismissed: false,
    };
  }

  if (percentUsed >= settings.warningThreshold) {
    return {
      id: `usage_warning_${Date.now()}`,
      type: 'usage',
      severity: 'warning',
      title: 'Usage Warning',
      message: `You've used ${percentUsed.toFixed(0)}% of your monthly budget ($${currentCost.toFixed(2)} of $${settings.monthlyBudget})`,
      createdAt: new Date(),
      dismissed: false,
    };
  }

  return null;
}

/**
 * Check balance against thresholds
 * 
 * @param {string} provider - Provider name
 * @param {number} balance - Current balance
 * @param {AlertSettings} settings - Alert settings
 * @returns {Alert|null} Alert if threshold exceeded
 */
export function checkBalanceAlert(provider, balance, settings) {
  if (!settings?.enabled || balance === null || balance === undefined) return null;

  const providerNames = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
  };
  const providerName = providerNames[provider] || provider;

  if (balance <= settings.balanceCritical) {
    return {
      id: `balance_critical_${provider}_${Date.now()}`,
      type: 'balance',
      severity: 'critical',
      title: `${providerName} Balance Critical`,
      message: `Your ${providerName} balance is very low: $${balance.toFixed(2)}`,
      provider,
      createdAt: new Date(),
      dismissed: false,
    };
  }

  if (balance <= settings.balanceWarning) {
    return {
      id: `balance_warning_${provider}_${Date.now()}`,
      type: 'balance',
      severity: 'warning',
      title: `${providerName} Balance Low`,
      message: `Your ${providerName} balance is running low: $${balance.toFixed(2)}`,
      provider,
      createdAt: new Date(),
      dismissed: false,
    };
  }

  return null;
}

/**
 * Check all balances and generate alerts
 * 
 * @param {Object} balances - Balances by provider
 * @param {AlertSettings} settings - Alert settings
 * @returns {Alert[]} Array of alerts
 */
export function checkAllBalanceAlerts(balances, settings) {
  if (!settings?.enabled) return [];

  const alerts = [];
  const providers = ['openai', 'anthropic', 'gemini'];

  for (const provider of providers) {
    const balance = balances[provider]?.balance;
    if (balance !== null && balance !== undefined) {
      const alert = checkBalanceAlert(provider, balance, settings);
      if (alert) alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Generate all alerts based on current state
 * 
 * @param {Object} params - Parameters
 * @param {number} params.currentCost - Current month's cost
 * @param {Object} params.balances - Balances by provider
 * @param {AlertSettings} params.settings - Alert settings
 * @returns {Alert[]} Array of all alerts
 */
export function generateAlerts({ currentCost, balances, settings }) {
  if (!settings?.enabled) return [];

  const alerts = [];

  // Check usage
  const usageAlert = checkUsageAlert(currentCost, settings);
  if (usageAlert) alerts.push(usageAlert);

  // Check balances
  const balanceAlerts = checkAllBalanceAlerts(balances, settings);
  alerts.push(...balanceAlerts);

  return alerts;
}

/**
 * Get alert settings from organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @returns {Promise<AlertSettings>} Alert settings
 */
export async function getAlertSettings(db, orgId) {
  if (!db || !orgId) return DEFAULT_ALERT_SETTINGS;

  try {
    const orgRef = doc(db, 'organizations', orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) return DEFAULT_ALERT_SETTINGS;

    const settings = orgSnap.data().settings?.usageAlerts;
    return {
      ...DEFAULT_ALERT_SETTINGS,
      ...settings,
    };
  } catch (error) {
    console.error('Failed to get alert settings:', error);
    return DEFAULT_ALERT_SETTINGS;
  }
}

/**
 * Update alert settings for organization
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {Partial<AlertSettings>} settings - Settings to update
 * @returns {Promise<void>}
 */
export async function updateAlertSettings(db, orgId, settings) {
  if (!db || !orgId) {
    throw new Error('Missing required parameters');
  }

  const orgRef = doc(db, 'organizations', orgId);
  
  await updateDoc(orgRef, {
    'settings.usageAlerts': {
      ...DEFAULT_ALERT_SETTINGS,
      ...settings,
      updatedAt: serverTimestamp(),
    },
  });
}

/**
 * Dismiss an alert
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {string} alertId - Alert ID to dismiss
 * @returns {Promise<void>}
 */
export async function dismissAlert(db, orgId, alertId) {
  if (!db || !orgId || !alertId) return;

  const orgRef = doc(db, 'organizations', orgId);
  const orgSnap = await getDoc(orgRef);

  if (!orgSnap.exists()) return;

  const dismissedAlerts = orgSnap.data().dismissedAlerts || [];
  
  await updateDoc(orgRef, {
    dismissedAlerts: [...dismissedAlerts, alertId],
  });
}

/**
 * Get dismissed alert IDs
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @returns {Promise<string[]>} Dismissed alert IDs
 */
export async function getDismissedAlerts(db, orgId) {
  if (!db || !orgId) return [];

  try {
    const orgRef = doc(db, 'organizations', orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) return [];

    return orgSnap.data().dismissedAlerts || [];
  } catch (error) {
    console.error('Failed to get dismissed alerts:', error);
    return [];
  }
}

/**
 * Filter out dismissed alerts
 * 
 * @param {Alert[]} alerts - All alerts
 * @param {string[]} dismissedIds - Dismissed alert IDs
 * @returns {Alert[]} Active alerts
 */
export function filterDismissedAlerts(alerts, dismissedIds) {
  if (!dismissedIds?.length) return alerts;
  
  // For alerts, we check if any dismissed ID starts with the same prefix
  // This allows dismissing alerts by type (e.g., all usage_warning alerts)
  return alerts.filter(alert => {
    const alertPrefix = alert.id.split('_').slice(0, -1).join('_');
    return !dismissedIds.some(id => 
      id === alert.id || id.startsWith(alertPrefix)
    );
  });
}

/**
 * Get severity color classes
 * 
 * @param {'warning' | 'critical'} severity - Alert severity
 * @param {boolean} darkMode - Dark mode toggle
 * @returns {Object} Color classes
 */
export function getAlertColors(severity, darkMode) {
  if (severity === 'critical') {
    return {
      bg: darkMode ? 'bg-red-900/30' : 'bg-red-50',
      border: darkMode ? 'border-red-800' : 'border-red-200',
      text: darkMode ? 'text-red-400' : 'text-red-700',
      icon: 'text-red-500',
    };
  }
  
  return {
    bg: darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50',
    border: darkMode ? 'border-yellow-800' : 'border-yellow-200',
    text: darkMode ? 'text-yellow-400' : 'text-yellow-700',
    icon: 'text-yellow-500',
  };
}

/**
 * Format alert for display
 * 
 * @param {Alert} alert - Alert to format
 * @returns {Object} Formatted alert data
 */
export function formatAlert(alert) {
  return {
    ...alert,
    timeAgo: getTimeAgo(alert.createdAt),
  };
}

/**
 * Get relative time string
 * 
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
function getTimeAgo(date) {
  if (!date) return '';
  
  const now = new Date();
  const then = date instanceof Date ? date : new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
