/**
 * UsageDashboard - Analytics dashboard for API usage
 * 
 * Shows usage stats, costs, provider breakdown, and balances.
 */

import { useState } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatCost, formatTokens, FEATURE_LABELS } from '../../lib/pricing';
import { formatBalance, getBalanceStatus } from '../../lib/balanceService';

/**
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode toggle
 * @param {Object} props.stats - Usage stats from useUsageStats hook
 */
export default function UsageDashboard({ darkMode, stats }) {
  const [selectedView, setSelectedView] = useState('overview');

  const {
    summary,
    providerBreakdown,
    featureBreakdown,
    balances,
    monthOverMonth,
    topUsers,
    chartData,
    recentLogs,
    loading,
    refreshing,
    refresh,
    refreshBalances,
  } = stats;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className={`w-6 h-6 animate-spin ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Usage Analytics
        </h3>
        <button
          onClick={refresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            darkMode
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          darkMode={darkMode}
          icon={<DollarSign className="w-5 h-5" />}
          label="This Month"
          value={formatCost(summary.totalCost, 2)}
          change={monthOverMonth}
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<Zap className="w-5 h-5" />}
          label="Requests"
          value={summary.totalRequests.toLocaleString()}
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<BarChart3 className="w-5 h-5" />}
          label="Input Tokens"
          value={formatTokens(summary.totalInputTokens)}
        />
        <SummaryCard
          darkMode={darkMode}
          icon={<BarChart3 className="w-5 h-5" />}
          label="Output Tokens"
          value={formatTokens(summary.totalOutputTokens)}
        />
      </div>

      {/* Balances Section */}
      <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            API Balances
          </h4>
          <button
            onClick={refreshBalances}
            disabled={refreshing}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              darkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`w-3 h-3 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <BalanceCard darkMode={darkMode} provider="OpenAI" balance={balances.openai} />
          <BalanceCard darkMode={darkMode} provider="Anthropic" balance={balances.anthropic} />
          <BalanceCard darkMode={darkMode} provider="Gemini" balance={balances.gemini} />
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h4 className={`font-medium mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Usage by Provider
        </h4>
        <div className="space-y-3">
          {Object.entries(providerBreakdown).length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No usage data yet
            </p>
          ) : (
            Object.entries(providerBreakdown).map(([provider, data]) => (
              <ProviderRow
                key={provider}
                darkMode={darkMode}
                provider={provider}
                data={data}
                totalCost={summary.totalCost}
              />
            ))
          )}
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h4 className={`font-medium mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Usage by Feature
        </h4>
        <div className="space-y-3">
          {Object.entries(featureBreakdown).length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No usage data yet
            </p>
          ) : (
            Object.entries(featureBreakdown).map(([feature, data]) => (
              <FeatureRow
                key={feature}
                darkMode={darkMode}
                feature={feature}
                data={data}
                totalCost={summary.totalCost}
              />
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h4 className={`font-medium mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Recent Activity
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentLogs.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No recent activity
            </p>
          ) : (
            recentLogs.slice(0, 10).map((log, idx) => (
              <ActivityRow key={log.id || idx} darkMode={darkMode} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ darkMode, icon, label, value, change }) {
  return (
    <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{icon}</span>
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <div className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
        {value}
      </div>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${
          change.direction === 'up' ? 'text-red-500' : 'text-green-500'
        }`}>
          {change.direction === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(change.percentage).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}

// Balance Card Component
function BalanceCard({ darkMode, provider, balance }) {
  const status = getBalanceStatus(balance);
  const statusColors = {
    ok: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
    unknown: darkMode ? 'text-slate-400' : 'text-slate-500',
  };

  return (
    <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
      <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {provider}
      </div>
      <div className={`font-semibold ${statusColors[status]}`}>
        {formatBalance(balance)}
      </div>
      {balance?.source === 'manual' && (
        <div className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Manual entry
        </div>
      )}
      {status === 'warning' && (
        <div className="flex items-center gap-1 text-xs text-yellow-500 mt-1">
          <AlertTriangle className="w-3 h-3" />
          Low balance
        </div>
      )}
      {status === 'critical' && (
        <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
          <AlertTriangle className="w-3 h-3" />
          Very low
        </div>
      )}
    </div>
  );
}

// Provider Row Component
function ProviderRow({ darkMode, provider, data, totalCost }) {
  const percentage = totalCost > 0 ? ((data.cost || 0) / totalCost) * 100 : 0;
  const providerNames = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Gemini',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {providerNames[provider] || provider}
        </span>
        <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {formatCost(data.cost, 2)} ({data.requests} req)
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Feature Row Component
function FeatureRow({ darkMode, feature, data, totalCost }) {
  const percentage = totalCost > 0 ? ((data.cost || 0) / totalCost) * 100 : 0;
  const label = FEATURE_LABELS[feature] || feature;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </span>
        <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {formatCost(data.cost, 2)} ({data.requests} req)
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Activity Row Component
function ActivityRow({ darkMode, log }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex items-center justify-between py-2 border-b last:border-0 ${
      darkMode ? 'border-slate-700' : 'border-slate-100'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
          darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
        }`}>
          {log.provider?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {log.model || 'Unknown model'}
          </div>
          <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {FEATURE_LABELS[log.feature] || log.feature}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {formatCost(log.estimatedCost, 4)}
        </div>
        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {formatTime(log.timestamp)}
        </div>
      </div>
    </div>
  );
}
