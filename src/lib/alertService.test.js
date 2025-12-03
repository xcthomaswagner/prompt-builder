/**
 * Unit tests for alertService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...path) => ({ db, path: path.join('/') })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

import { getDoc, updateDoc } from 'firebase/firestore';
import {
  DEFAULT_ALERT_SETTINGS,
  ALERT_TYPES,
  checkUsageAlert,
  checkBalanceAlert,
  checkAllBalanceAlerts,
  generateAlerts,
  getAlertSettings,
  updateAlertSettings,
  dismissAlert,
  getDismissedAlerts,
  filterDismissedAlerts,
  getAlertColors,
  formatAlert,
} from './alertService';

describe('alertService', () => {
  const mockDb = { type: 'firestore' };
  const mockOrgId = 'org_user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_ALERT_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ALERT_SETTINGS.enabled).toBe(true);
      expect(DEFAULT_ALERT_SETTINGS.monthlyBudget).toBe(100);
      expect(DEFAULT_ALERT_SETTINGS.warningThreshold).toBe(80);
      expect(DEFAULT_ALERT_SETTINGS.criticalThreshold).toBe(95);
      expect(DEFAULT_ALERT_SETTINGS.balanceWarning).toBe(10);
      expect(DEFAULT_ALERT_SETTINGS.balanceCritical).toBe(5);
    });
  });

  describe('ALERT_TYPES', () => {
    it('should have all alert type constants', () => {
      expect(ALERT_TYPES.USAGE_WARNING).toBe('usage_warning');
      expect(ALERT_TYPES.USAGE_CRITICAL).toBe('usage_critical');
      expect(ALERT_TYPES.BALANCE_WARNING).toBe('balance_warning');
      expect(ALERT_TYPES.BALANCE_CRITICAL).toBe('balance_critical');
    });
  });

  describe('checkUsageAlert', () => {
    it('should return null when alerts disabled', () => {
      const result = checkUsageAlert(50, { enabled: false });
      expect(result).toBe(null);
    });

    it('should return null when under warning threshold', () => {
      const result = checkUsageAlert(50, DEFAULT_ALERT_SETTINGS);
      expect(result).toBe(null);
    });

    it('should return warning alert at warning threshold', () => {
      const result = checkUsageAlert(80, DEFAULT_ALERT_SETTINGS);
      expect(result).not.toBe(null);
      expect(result.severity).toBe('warning');
      expect(result.type).toBe('usage');
    });

    it('should return critical alert at critical threshold', () => {
      const result = checkUsageAlert(95, DEFAULT_ALERT_SETTINGS);
      expect(result).not.toBe(null);
      expect(result.severity).toBe('critical');
    });

    it('should return critical for over budget', () => {
      const result = checkUsageAlert(110, DEFAULT_ALERT_SETTINGS);
      expect(result.severity).toBe('critical');
    });
  });

  describe('checkBalanceAlert', () => {
    it('should return null when alerts disabled', () => {
      const result = checkBalanceAlert('openai', 5, { enabled: false });
      expect(result).toBe(null);
    });

    it('should return null for healthy balance', () => {
      const result = checkBalanceAlert('openai', 50, DEFAULT_ALERT_SETTINGS);
      expect(result).toBe(null);
    });

    it('should return warning for low balance', () => {
      const result = checkBalanceAlert('openai', 8, DEFAULT_ALERT_SETTINGS);
      expect(result).not.toBe(null);
      expect(result.severity).toBe('warning');
      expect(result.provider).toBe('openai');
    });

    it('should return critical for very low balance', () => {
      const result = checkBalanceAlert('anthropic', 3, DEFAULT_ALERT_SETTINGS);
      expect(result).not.toBe(null);
      expect(result.severity).toBe('critical');
      expect(result.title).toContain('Anthropic');
    });

    it('should return null for null balance', () => {
      const result = checkBalanceAlert('openai', null, DEFAULT_ALERT_SETTINGS);
      expect(result).toBe(null);
    });
  });

  describe('checkAllBalanceAlerts', () => {
    it('should return empty array when disabled', () => {
      const result = checkAllBalanceAlerts({}, { enabled: false });
      expect(result).toEqual([]);
    });

    it('should check all providers', () => {
      const balances = {
        openai: { balance: 3 },
        anthropic: { balance: 50 },
        gemini: { balance: 8 },
      };
      const result = checkAllBalanceAlerts(balances, DEFAULT_ALERT_SETTINGS);
      
      expect(result.length).toBe(2); // openai critical, gemini warning
      expect(result.some(a => a.provider === 'openai' && a.severity === 'critical')).toBe(true);
      expect(result.some(a => a.provider === 'gemini' && a.severity === 'warning')).toBe(true);
    });
  });

  describe('generateAlerts', () => {
    it('should return empty array when disabled', () => {
      const result = generateAlerts({
        currentCost: 100,
        balances: {},
        settings: { enabled: false },
      });
      expect(result).toEqual([]);
    });

    it('should combine usage and balance alerts', () => {
      const result = generateAlerts({
        currentCost: 85,
        balances: { openai: { balance: 3 } },
        settings: DEFAULT_ALERT_SETTINGS,
      });

      expect(result.length).toBe(2);
      expect(result.some(a => a.type === 'usage')).toBe(true);
      expect(result.some(a => a.type === 'balance')).toBe(true);
    });
  });

  describe('getAlertSettings', () => {
    it('should return defaults for missing parameters', async () => {
      const result = await getAlertSettings(null, null);
      expect(result).toEqual(DEFAULT_ALERT_SETTINGS);
    });

    it('should return stored settings merged with defaults', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          settings: {
            usageAlerts: {
              enabled: false,
              monthlyBudget: 200,
            },
          },
        }),
      });

      const result = await getAlertSettings(mockDb, mockOrgId);

      expect(result.enabled).toBe(false);
      expect(result.monthlyBudget).toBe(200);
      expect(result.warningThreshold).toBe(80); // Default
    });
  });

  describe('updateAlertSettings', () => {
    it('should throw for missing parameters', async () => {
      await expect(updateAlertSettings(null, null, {}))
        .rejects.toThrow('Missing required parameters');
    });

    it('should update settings in Firestore', async () => {
      updateDoc.mockResolvedValueOnce();

      await updateAlertSettings(mockDb, mockOrgId, { monthlyBudget: 500 });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `organizations/${mockOrgId}` }),
        expect.objectContaining({
          'settings.usageAlerts': expect.objectContaining({
            monthlyBudget: 500,
          }),
        })
      );
    });
  });

  describe('dismissAlert', () => {
    it('should add alert ID to dismissed list', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ dismissedAlerts: ['old-alert'] }),
      });
      updateDoc.mockResolvedValueOnce();

      await dismissAlert(mockDb, mockOrgId, 'new-alert');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dismissedAlerts: ['old-alert', 'new-alert'],
        })
      );
    });
  });

  describe('getDismissedAlerts', () => {
    it('should return empty array for missing parameters', async () => {
      const result = await getDismissedAlerts(null, null);
      expect(result).toEqual([]);
    });

    it('should return dismissed alert IDs', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ dismissedAlerts: ['alert-1', 'alert-2'] }),
      });

      const result = await getDismissedAlerts(mockDb, mockOrgId);
      expect(result).toEqual(['alert-1', 'alert-2']);
    });
  });

  describe('filterDismissedAlerts', () => {
    it('should return all alerts when no dismissed', () => {
      const alerts = [{ id: 'a1' }, { id: 'a2' }];
      const result = filterDismissedAlerts(alerts, []);
      expect(result).toHaveLength(2);
    });

    it('should filter out dismissed alerts', () => {
      const alerts = [
        { id: 'usage_warning_123' },
        { id: 'balance_critical_456' },
      ];
      const result = filterDismissedAlerts(alerts, ['usage_warning_123']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('balance_critical_456');
    });
  });

  describe('getAlertColors', () => {
    it('should return warning colors', () => {
      const colors = getAlertColors('warning', false);
      expect(colors.bg).toContain('yellow');
      expect(colors.icon).toContain('yellow');
    });

    it('should return critical colors', () => {
      const colors = getAlertColors('critical', false);
      expect(colors.bg).toContain('red');
      expect(colors.icon).toContain('red');
    });

    it('should handle dark mode', () => {
      const lightColors = getAlertColors('warning', false);
      const darkColors = getAlertColors('warning', true);
      expect(lightColors.bg).not.toBe(darkColors.bg);
    });
  });

  describe('formatAlert', () => {
    it('should add timeAgo to alert', () => {
      const alert = {
        id: 'test',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      };
      const formatted = formatAlert(alert);
      expect(formatted.timeAgo).toBe('5m ago');
    });

    it('should handle recent alerts', () => {
      const alert = {
        id: 'test',
        createdAt: new Date(),
      };
      const formatted = formatAlert(alert);
      expect(formatted.timeAgo).toBe('Just now');
    });
  });
});
