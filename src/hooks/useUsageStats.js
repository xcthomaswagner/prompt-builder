/**
 * useUsageStats Hook - Fetch and manage usage statistics
 * 
 * Provides usage data for the analytics dashboard.
 * 
 * @module hooks/useUsageStats
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getMonthlyAggregate, 
  getUsageHistory, 
  getUsageLogs,
  getCurrentMonth 
} from '../lib/usageService';
import { 
  getStoredBalances, 
  refreshAndStoreBalances,
  fetchAllBalances 
} from '../lib/balanceService';

/**
 * Hook for fetching and managing usage statistics
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} orgId - Organization ID
 * @param {Object} [apiKeys] - API keys for balance fetching
 * @returns {Object} Usage stats and controls
 */
export default function useUsageStats(db, orgId, apiKeys = {}) {
  const [currentMonth, setCurrentMonth] = useState(null);
  const [history, setHistory] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all usage data
  const fetchData = useCallback(async () => {
    if (!db || !orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch in parallel
      const [monthData, historyData, logsData, balanceData] = await Promise.all([
        getMonthlyAggregate(db, orgId),
        getUsageHistory(db, orgId, 6),
        getUsageLogs(db, orgId, { limit: 20 }),
        getStoredBalances(db, orgId),
      ]);

      setCurrentMonth(monthData);
      setHistory(historyData);
      setRecentLogs(logsData);
      setBalances(balanceData);
    } catch (err) {
      console.error('Failed to fetch usage stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, orgId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh balances from APIs
  const refreshBalances = useCallback(async () => {
    if (!db || !orgId) return;

    try {
      setRefreshing(true);
      
      // Fetch fresh balances
      const freshBalances = await fetchAllBalances(apiKeys);
      
      // Store in Firestore
      await refreshAndStoreBalances(db, orgId, apiKeys);
      
      // Update local state
      setBalances(prev => ({
        ...prev,
        ...freshBalances,
      }));
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    } finally {
      setRefreshing(false);
    }
  }, [db, orgId, apiKeys]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Calculate summary stats
  const summary = {
    totalRequests: currentMonth?.totalRequests || 0,
    totalCost: currentMonth?.totalCost || 0,
    totalInputTokens: currentMonth?.totalInputTokens || 0,
    totalOutputTokens: currentMonth?.totalOutputTokens || 0,
    month: getCurrentMonth(),
  };

  // Provider breakdown for current month
  const providerBreakdown = currentMonth?.byProvider || {};

  // User breakdown for current month
  const userBreakdown = currentMonth?.byUser || {};

  // Feature breakdown for current month
  const featureBreakdown = currentMonth?.byFeature || {};

  // Calculate month-over-month change
  const monthOverMonth = (() => {
    if (history.length < 2) return null;
    
    const current = history[0]?.totalCost || 0;
    const previous = history[1]?.totalCost || 0;
    
    if (previous === 0) return null;
    
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: change,
      direction: change >= 0 ? 'up' : 'down',
      current,
      previous,
    };
  })();

  // Top users by cost
  const topUsers = Object.entries(userBreakdown)
    .map(([userId, stats]) => ({
      userId,
      ...stats,
    }))
    .sort((a, b) => (b.cost || 0) - (a.cost || 0))
    .slice(0, 5);

  // Chart data for history
  const chartData = history
    .slice()
    .reverse()
    .map(month => ({
      month: month.month,
      cost: month.totalCost || 0,
      requests: month.totalRequests || 0,
    }));

  return {
    // Data
    currentMonth,
    history,
    recentLogs,
    balances,
    summary,
    providerBreakdown,
    userBreakdown,
    featureBreakdown,
    monthOverMonth,
    topUsers,
    chartData,
    
    // State
    loading,
    error,
    refreshing,
    
    // Actions
    refresh,
    refreshBalances,
  };
}
