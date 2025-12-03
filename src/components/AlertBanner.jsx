/**
 * AlertBanner - Display usage and balance alerts
 * 
 * Shows dismissible alert banners for warnings and critical alerts.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, X, DollarSign, Zap } from 'lucide-react';
import { getAlertColors, formatAlert } from '../lib/alertService';

/**
 * @param {Object} props
 * @param {Array} props.alerts - Array of alerts to display
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {Function} props.onDismiss - Callback when alert is dismissed
 */
export default function AlertBanner({ alerts, darkMode, onDismiss }) {
  const [visibleAlerts, setVisibleAlerts] = useState([]);

  useEffect(() => {
    setVisibleAlerts(alerts || []);
  }, [alerts]);

  if (!visibleAlerts.length) return null;

  const handleDismiss = (alertId) => {
    setVisibleAlerts(prev => prev.filter(a => a.id !== alertId));
    onDismiss?.(alertId);
  };

  // Only show the most important alerts (max 3)
  const displayAlerts = visibleAlerts
    .sort((a, b) => {
      // Critical first
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      // Then by date
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 3);

  return (
    <div className="space-y-2 mb-4">
      {displayAlerts.map(alert => (
        <AlertItem
          key={alert.id}
          alert={formatAlert(alert)}
          darkMode={darkMode}
          onDismiss={() => handleDismiss(alert.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual alert item
 */
function AlertItem({ alert, darkMode, onDismiss }) {
  const colors = getAlertColors(alert.severity, darkMode);
  
  const getIcon = () => {
    switch (alert.type) {
      case 'usage':
        return <Zap className={`w-5 h-5 ${colors.icon}`} />;
      case 'balance':
        return <DollarSign className={`w-5 h-5 ${colors.icon}`} />;
      default:
        return <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />;
    }
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium text-sm ${colors.text}`}>
            {alert.title}
          </h4>
          {alert.timeAgo && (
            <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {alert.timeAgo}
            </span>
          )}
        </div>
        <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {alert.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          darkMode 
            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' 
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
        }`}
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Compact alert indicator for header/sidebar
 */
export function AlertIndicator({ alertCount, severity, darkMode, onClick }) {
  if (!alertCount) return null;

  const colors = getAlertColors(severity || 'warning', darkMode);

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${colors.bg} ${colors.border} border ${colors.text}`}
      title={`${alertCount} alert${alertCount > 1 ? 's' : ''}`}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>{alertCount}</span>
    </button>
  );
}
