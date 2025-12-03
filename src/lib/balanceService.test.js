/**
 * Unit tests for balanceService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...path) => ({ db, path: path.join('/') })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { getDoc, updateDoc } from 'firebase/firestore';
import {
  fetchOpenAIBalance,
  fetchAnthropicBalance,
  fetchGeminiBalance,
  fetchProviderBalance,
  fetchAllBalances,
  saveManualBalance,
  getStoredBalances,
  formatBalance,
  getBalanceStatus,
  needsRefresh,
} from './balanceService';

describe('balanceService', () => {
  const mockDb = { type: 'firestore' };
  const mockOrgId = 'org_user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchOpenAIBalance', () => {
    it('should return error for missing API key', async () => {
      const result = await fetchOpenAIBalance('');
      expect(result.balance).toBe(null);
      expect(result.error).toContain('No API key');
    });

    it('should return balance on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          total_granted: 100,
          total_used: 25,
        }),
      });

      const result = await fetchOpenAIBalance('sk-test-key');

      expect(result.balance).toBe(75);
      expect(result.limit).toBe(100);
      expect(result.used).toBe(25);
      expect(result.source).toBe('auto');
      expect(result.error).toBe(null);
    });

    it('should handle 401 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await fetchOpenAIBalance('sk-invalid-key');

      expect(result.balance).toBe(null);
      expect(result.error).toContain('Invalid API key');
    });

    it('should handle 403 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await fetchOpenAIBalance('sk-test-key');

      expect(result.balance).toBe(null);
      expect(result.error).toContain('billing permissions');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchOpenAIBalance('sk-test-key');

      expect(result.balance).toBe(null);
      expect(result.error).toContain('Network error');
    });
  });

  describe('fetchAnthropicBalance', () => {
    it('should return manual entry requirement', async () => {
      const result = await fetchAnthropicBalance('sk-ant-test-key');

      expect(result.balance).toBe(null);
      expect(result.source).toBe('manual');
      expect(result.error).toContain('manual balance entry');
    });

    it('should return error for missing key', async () => {
      const result = await fetchAnthropicBalance('');
      expect(result.error).toContain('No API key');
    });
  });

  describe('fetchGeminiBalance', () => {
    it('should return manual entry requirement', async () => {
      const result = await fetchGeminiBalance('AIza-test-key');

      expect(result.balance).toBe(null);
      expect(result.source).toBe('manual');
      expect(result.error).toContain('manual balance entry');
    });
  });

  describe('fetchProviderBalance', () => {
    it('should route to correct provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_granted: 50, total_used: 10 }),
      });

      const result = await fetchProviderBalance('openai', 'sk-test');
      expect(result.balance).toBe(40);
    });

    it('should return error for unknown provider', async () => {
      const result = await fetchProviderBalance('unknown', 'key');
      expect(result.error).toContain('Unknown provider');
    });
  });

  describe('fetchAllBalances', () => {
    it('should fetch balances for all providers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_granted: 100, total_used: 20 }),
      });

      const results = await fetchAllBalances({
        openai: 'sk-test',
        anthropic: 'sk-ant-test',
        gemini: 'AIza-test',
      });

      expect(results.openai.balance).toBe(80);
      expect(results.anthropic.source).toBe('manual');
      expect(results.gemini.source).toBe('manual');
    });
  });

  describe('saveManualBalance', () => {
    it('should throw for missing parameters', async () => {
      await expect(saveManualBalance(null, null, null, 100))
        .rejects.toThrow('Missing required parameters');
    });

    it('should save balance to Firestore', async () => {
      updateDoc.mockResolvedValueOnce();

      await saveManualBalance(mockDb, mockOrgId, 'anthropic', 50);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `organizations/${mockOrgId}` }),
        expect.objectContaining({
          'balances.anthropic': expect.objectContaining({
            balance: 50,
            source: 'manual',
          }),
        })
      );
    });
  });

  describe('getStoredBalances', () => {
    it('should return empty object for missing parameters', async () => {
      const result = await getStoredBalances(null, null);
      expect(result).toEqual({});
    });

    it('should return stored balances', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          balances: {
            openai: { balance: 75, source: 'auto' },
            anthropic: { balance: 50, source: 'manual' },
          },
        }),
      });

      const result = await getStoredBalances(mockDb, mockOrgId);

      expect(result.openai.balance).toBe(75);
      expect(result.anthropic.balance).toBe(50);
    });

    it('should return empty object for non-existent org', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });

      const result = await getStoredBalances(mockDb, mockOrgId);
      expect(result).toEqual({});
    });
  });

  describe('formatBalance', () => {
    it('should format valid balance', () => {
      expect(formatBalance({ balance: 75.5 })).toBe('$75.50');
      expect(formatBalance({ balance: 0 })).toBe('$0.00');
    });

    it('should return N/A for error with null balance', () => {
      expect(formatBalance({ balance: null, error: 'Some error' })).toBe('N/A');
    });

    it('should return dash for null/undefined', () => {
      expect(formatBalance(null)).toBe('—');
      expect(formatBalance(undefined)).toBe('—');
      expect(formatBalance({ balance: null })).toBe('—');
    });
  });

  describe('getBalanceStatus', () => {
    it('should return ok for healthy balance', () => {
      expect(getBalanceStatus({ balance: 50 })).toBe('ok');
      expect(getBalanceStatus({ balance: 15 })).toBe('ok');
    });

    it('should return warning for low balance', () => {
      expect(getBalanceStatus({ balance: 8 })).toBe('warning');
      expect(getBalanceStatus({ balance: 6 })).toBe('warning');
    });

    it('should return critical for very low balance', () => {
      expect(getBalanceStatus({ balance: 4 })).toBe('critical');
      expect(getBalanceStatus({ balance: 0 })).toBe('critical');
    });

    it('should return unknown for null balance', () => {
      expect(getBalanceStatus(null)).toBe('unknown');
      expect(getBalanceStatus({ balance: null })).toBe('unknown');
    });

    it('should respect custom thresholds', () => {
      expect(getBalanceStatus({ balance: 15 }, 20, 10)).toBe('warning');
      expect(getBalanceStatus({ balance: 8 }, 20, 10)).toBe('critical');
    });
  });

  describe('needsRefresh', () => {
    it('should return true for null/undefined', () => {
      expect(needsRefresh(null)).toBe(true);
      expect(needsRefresh(undefined)).toBe(true);
      expect(needsRefresh({})).toBe(true);
    });

    it('should return true for old data', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(needsRefresh({ fetchedAt: oldDate })).toBe(true);
    });

    it('should return false for recent data', () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      expect(needsRefresh({ fetchedAt: recentDate })).toBe(false);
    });

    it('should respect custom max age', () => {
      const date = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(needsRefresh({ fetchedAt: date }, 5 * 60 * 1000)).toBe(true); // 5 min max
      expect(needsRefresh({ fetchedAt: date }, 15 * 60 * 1000)).toBe(false); // 15 min max
    });
  });
});
