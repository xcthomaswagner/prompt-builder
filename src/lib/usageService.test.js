/**
 * Unit tests for usageService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...path) => ({ db, path: path.join('/') })),
  doc: vi.fn((db, ...path) => ({ db, path: path.join('/') })),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((ref) => ref),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  increment: vi.fn((n) => ({ _increment: n })),
}));

import { addDoc, getDoc, setDoc, updateDoc, getDocs } from 'firebase/firestore';
import {
  FEATURES,
  logUsage,
  getUsageLogs,
  getMonthlyAggregate,
  getUsageHistory,
  getCurrentMonth,
  getLastNMonths,
  getUserTotalUsage,
  createUsageLogger,
} from './usageService';

describe('usageService', () => {
  const mockDb = { type: 'firestore' };
  const mockOrgId = 'org_user-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FEATURES', () => {
    it('should have all feature constants', () => {
      expect(FEATURES.PROMPT_GENERATION).toBe('prompt_generation');
      expect(FEATURES.EXPERIMENT).toBe('experiment');
      expect(FEATURES.REVERSE_PROMPT).toBe('reverse_prompt');
      expect(FEATURES.QUALITY_ASSESSMENT).toBe('quality_assessment');
      expect(FEATURES.AUTO_IMPROVE).toBe('auto_improve');
      expect(FEATURES.REFINEMENT).toBe('refinement');
    });
  });

  describe('logUsage', () => {
    it('should return null for missing parameters', async () => {
      const result = await logUsage(null, {});
      expect(result).toBe(null);
    });

    it('should log usage and return doc ID', async () => {
      addDoc.mockResolvedValueOnce({ id: 'log-123' });
      getDoc.mockResolvedValueOnce({ exists: () => false });
      setDoc.mockResolvedValueOnce();

      const result = await logUsage(mockDb, {
        orgId: mockOrgId,
        userId: mockUserId,
        userEmail: 'test@example.com',
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
        feature: FEATURES.PROMPT_GENERATION,
        keySource: 'org',
      });

      expect(result).toBe('log-123');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should calculate cost from model and tokens', async () => {
      addDoc.mockResolvedValueOnce({ id: 'log-123' });
      getDoc.mockResolvedValueOnce({ exists: () => false });
      setDoc.mockResolvedValueOnce();

      await logUsage(mockDb, {
        orgId: mockOrgId,
        userId: mockUserId,
        model: 'gpt-4o',
        inputTokens: 1000000, // 1M tokens
        outputTokens: 1000000,
        feature: FEATURES.EXPERIMENT,
      });

      // Verify addDoc was called with calculated cost
      const addDocCall = addDoc.mock.calls[0][1];
      expect(addDocCall.estimatedCost).toBe(12.5); // $2.50 + $10.00 per 1M
      expect(addDocCall.provider).toBe('openai');
    });

    it('should update monthly aggregate for new month', async () => {
      addDoc.mockResolvedValueOnce({ id: 'log-123' });
      getDoc.mockResolvedValueOnce({ exists: () => false }); // No existing aggregate
      setDoc.mockResolvedValueOnce();

      await logUsage(mockDb, {
        orgId: mockOrgId,
        userId: mockUserId,
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
        feature: FEATURES.PROMPT_GENERATION,
      });

      expect(setDoc).toHaveBeenCalled();
      const setDocCall = setDoc.mock.calls[0][1];
      expect(setDocCall.totalRequests).toBe(1);
      expect(setDocCall.byProvider.openai.requests).toBe(1);
    });

    it('should update existing monthly aggregate', async () => {
      addDoc.mockResolvedValueOnce({ id: 'log-123' });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          totalRequests: 5,
          byProvider: { openai: { requests: 3, inputTokens: 5000, outputTokens: 2000, cost: 0.05 } },
          byUser: { [mockUserId]: { requests: 2, cost: 0.02 } },
          byFeature: { prompt_generation: { requests: 2, cost: 0.02 } },
        }),
      });
      updateDoc.mockResolvedValueOnce();

      await logUsage(mockDb, {
        orgId: mockOrgId,
        userId: mockUserId,
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
        feature: FEATURES.PROMPT_GENERATION,
      });

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('getUsageLogs', () => {
    it('should return empty array for missing parameters', async () => {
      const result = await getUsageLogs(null, null);
      expect(result).toEqual([]);
    });

    it('should return usage logs', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              userId: mockUserId,
              provider: 'openai',
              model: 'gpt-4o',
              inputTokens: 1000,
              outputTokens: 500,
              timestamp: { toDate: () => new Date('2024-01-15') },
            }),
          },
          {
            id: 'log-2',
            data: () => ({
              userId: 'other-user',
              provider: 'anthropic',
              model: 'claude-3-5-sonnet',
              inputTokens: 2000,
              outputTokens: 1000,
              timestamp: { toDate: () => new Date('2024-01-14') },
            }),
          },
        ],
      });

      const logs = await getUsageLogs(mockDb, mockOrgId);

      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe('log-1');
    });

    it('should filter logs by userId', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'log-1', data: () => ({ userId: mockUserId, timestamp: { toDate: () => new Date() } }) },
          { id: 'log-2', data: () => ({ userId: 'other-user', timestamp: { toDate: () => new Date() } }) },
        ],
      });

      const logs = await getUsageLogs(mockDb, mockOrgId, { userId: mockUserId });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(mockUserId);
    });

    it('should filter logs by provider', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'log-1', data: () => ({ provider: 'openai', timestamp: { toDate: () => new Date() } }) },
          { id: 'log-2', data: () => ({ provider: 'anthropic', timestamp: { toDate: () => new Date() } }) },
        ],
      });

      const logs = await getUsageLogs(mockDb, mockOrgId, { provider: 'openai' });

      expect(logs).toHaveLength(1);
      expect(logs[0].provider).toBe('openai');
    });
  });

  describe('getMonthlyAggregate', () => {
    it('should return null for missing parameters', async () => {
      const result = await getMonthlyAggregate(null, null);
      expect(result).toBe(null);
    });

    it('should return empty aggregate for non-existent month', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });

      const result = await getMonthlyAggregate(mockDb, mockOrgId, '2024-01');

      expect(result.totalRequests).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.month).toBe('2024-01');
    });

    it('should return existing aggregate', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          orgId: mockOrgId,
          month: '2024-01',
          totalRequests: 100,
          totalCost: 5.50,
          byProvider: { openai: { requests: 60 }, anthropic: { requests: 40 } },
        }),
      });

      const result = await getMonthlyAggregate(mockDb, mockOrgId, '2024-01');

      expect(result.totalRequests).toBe(100);
      expect(result.totalCost).toBe(5.50);
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('getLastNMonths', () => {
    it('should return array of month strings', () => {
      const months = getLastNMonths(3);
      
      expect(months).toHaveLength(3);
      months.forEach(month => {
        expect(month).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    it('should return months in descending order', () => {
      const months = getLastNMonths(3);
      
      // First month should be current or most recent
      expect(months[0]).toBe(getCurrentMonth());
    });
  });

  describe('getUsageHistory', () => {
    it('should return empty array for missing parameters', async () => {
      const result = await getUsageHistory(null, null);
      expect(result).toEqual([]);
    });

    it('should return aggregates for multiple months', async () => {
      // Mock getDoc for each month
      getDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ month: getCurrentMonth(), totalRequests: 50 }),
        })
        .mockResolvedValueOnce({
          exists: () => false,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ month: '2024-01', totalRequests: 30 }),
        });

      const history = await getUsageHistory(mockDb, mockOrgId, 3);

      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('getUserTotalUsage', () => {
    it('should return null for missing parameters', async () => {
      const result = await getUserTotalUsage(null, null, null);
      expect(result).toBe(null);
    });

    it('should aggregate user usage across months', async () => {
      // Mock 12 months of data
      for (let i = 0; i < 12; i++) {
        getDoc.mockResolvedValueOnce({
          exists: () => i < 3, // Only first 3 months have data
          data: () => ({
            byUser: {
              [mockUserId]: { requests: 10, cost: 1.0 },
            },
          }),
        });
      }

      const result = await getUserTotalUsage(mockDb, mockOrgId, mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.totalRequests).toBe(30); // 10 * 3 months
      expect(result.totalCost).toBe(3.0);
    });
  });

  describe('createUsageLogger', () => {
    it('should create a bound logger function', async () => {
      addDoc.mockResolvedValueOnce({ id: 'log-123' });
      getDoc.mockResolvedValueOnce({ exists: () => false });
      setDoc.mockResolvedValueOnce();

      const logger = createUsageLogger(mockDb, mockOrgId, mockUserId, 'test@example.com', 'user');

      const result = await logger('gpt-4o', 1000, 500, FEATURES.PROMPT_GENERATION);

      expect(result).toBe('log-123');
      expect(addDoc).toHaveBeenCalled();
      
      const logEntry = addDoc.mock.calls[0][1];
      expect(logEntry.orgId).toBe(mockOrgId);
      expect(logEntry.userId).toBe(mockUserId);
      expect(logEntry.keySource).toBe('user');
    });
  });
});
