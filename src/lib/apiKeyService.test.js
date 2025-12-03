/**
 * Unit tests for apiKeyService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ db, collection, id })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import {
  resolveApiKey,
  resolveAllKeys,
  getUserApiKeys,
  saveUserApiKey,
  removeUserApiKey,
  hasUserKey,
  getEffectiveApiKeys,
  getKeySourceInfo,
} from './apiKeyService';

describe('apiKeyService', () => {
  const mockDb = { type: 'firestore' };
  const mockUserId = 'user-123';
  const mockOrgId = 'org_user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveApiKey', () => {
    it('should return null for missing parameters', async () => {
      const result = await resolveApiKey({ db: null, userId: null, provider: 'openai' });
      expect(result.key).toBe(null);
      expect(result.source).toBe(null);
    });

    it('should return org key when user has no personal key', async () => {
      // Mock org document with API key
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          settings: { allowUserKeys: true },
          apiKeys: { openai: { key: 'sk-org-key' } },
        }),
      });
      // Mock user document with no key
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ apiKeys: {} }),
      });

      const result = await resolveApiKey({
        db: mockDb,
        userId: mockUserId,
        orgId: mockOrgId,
        provider: 'openai',
      });

      expect(result.key).toBe('sk-org-key');
      expect(result.source).toBe('org');
    });

    it('should return user key when available and allowed', async () => {
      // Mock org document allowing user keys
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          settings: { allowUserKeys: true },
          apiKeys: { openai: { key: 'sk-org-key' } },
        }),
      });
      // Mock user document with personal key
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ apiKeys: { openai: { key: 'sk-user-key' } } }),
      });

      const result = await resolveApiKey({
        db: mockDb,
        userId: mockUserId,
        orgId: mockOrgId,
        provider: 'openai',
      });

      expect(result.key).toBe('sk-user-key');
      expect(result.source).toBe('user');
    });

    it('should return org key only in enterprise mode', async () => {
      // Mock org document with requireOrgKeys
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          settings: { requireOrgKeys: true },
          apiKeys: { openai: { key: 'sk-org-key' } },
        }),
      });

      const result = await resolveApiKey({
        db: mockDb,
        userId: mockUserId,
        orgId: mockOrgId,
        provider: 'openai',
      });

      expect(result.key).toBe('sk-org-key');
      expect(result.source).toBe('org');
      // Should not have called getDoc for user document
      expect(getDoc).toHaveBeenCalledTimes(1);
    });

    it('should return null when no keys available', async () => {
      // Mock org document with no keys
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          settings: { allowUserKeys: true },
          apiKeys: {},
        }),
      });
      // Mock user document with no keys
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ apiKeys: {} }),
      });

      const result = await resolveApiKey({
        db: mockDb,
        userId: mockUserId,
        orgId: mockOrgId,
        provider: 'openai',
      });

      expect(result.key).toBe(null);
      expect(result.source).toBe(null);
    });
  });

  describe('resolveAllKeys', () => {
    it('should resolve keys for all providers', async () => {
      // Mock implementation that returns different keys based on provider
      getDoc.mockImplementation((ref) => {
        if (ref.collection === 'organizations') {
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              settings: { allowUserKeys: true },
              apiKeys: {
                openai: { key: 'sk-openai' },
                anthropic: { key: 'sk-anthropic' },
                gemini: { key: 'AIza-gemini' },
              },
            }),
          });
        }
        // User document - no personal keys
        return Promise.resolve({
          exists: () => true,
          data: () => ({ apiKeys: {} }),
        });
      });

      const results = await resolveAllKeys(mockDb, mockUserId, mockOrgId);

      expect(results.openai.key).toBe('sk-openai');
      expect(results.anthropic.key).toBe('sk-anthropic');
      expect(results.gemini.key).toBe('AIza-gemini');
    });
  });

  describe('getUserApiKeys', () => {
    it('should return user API keys', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          apiKeys: {
            openai: { key: 'sk-user-openai' },
            gemini: { key: 'AIza-user-gemini' },
          },
        }),
      });

      const keys = await getUserApiKeys(mockDb, mockUserId);

      expect(keys.openai.key).toBe('sk-user-openai');
      expect(keys.gemini.key).toBe('AIza-user-gemini');
    });

    it('should return empty object for non-existent user', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });

      const keys = await getUserApiKeys(mockDb, mockUserId);

      expect(keys).toEqual({});
    });
  });

  describe('saveUserApiKey', () => {
    it('should save API key to user document', async () => {
      updateDoc.mockResolvedValueOnce();

      await saveUserApiKey(mockDb, mockUserId, 'openai', 'sk-new-key', { testStatus: 'valid' });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'users', id: mockUserId }),
        expect.objectContaining({
          'apiKeys.openai': expect.objectContaining({
            key: 'sk-new-key',
            testStatus: 'valid',
          }),
        })
      );
    });

    it('should throw for missing parameters', async () => {
      await expect(saveUserApiKey(null, mockUserId, 'openai', 'key'))
        .rejects.toThrow('Missing required parameters');
    });
  });

  describe('hasUserKey', () => {
    it('should return true when user has key', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ apiKeys: { openai: { key: 'sk-test' } } }),
      });

      const result = await hasUserKey(mockDb, mockUserId, 'openai');

      expect(result).toBe(true);
    });

    it('should return false when user has no key', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ apiKeys: {} }),
      });

      const result = await hasUserKey(mockDb, mockUserId, 'openai');

      expect(result).toBe(false);
    });
  });

  describe('getEffectiveApiKeys', () => {
    it('should return resolved keys with local fallback', async () => {
      // Mock implementation for parallel calls
      getDoc.mockImplementation((ref) => {
        if (ref.collection === 'organizations') {
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              settings: { allowUserKeys: true },
              apiKeys: { openai: { key: 'sk-org' } }, // Only org has openai
            }),
          });
        }
        // User document - no keys
        return Promise.resolve({
          exists: () => true,
          data: () => ({ apiKeys: {} }),
        });
      });

      const localKeys = { gemini: 'AIza-local' };
      const keys = await getEffectiveApiKeys(mockDb, mockUserId, mockOrgId, localKeys);

      expect(keys.openai).toBe('sk-org');
      expect(keys.gemini).toBe('AIza-local'); // Falls back to local
      expect(keys.anthropic).toBe(null);
    });
  });

  describe('getKeySourceInfo', () => {
    it('should return source info for all providers', async () => {
      // Mock implementation for parallel calls
      getDoc.mockImplementation((ref) => {
        if (ref.collection === 'organizations') {
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              settings: { allowUserKeys: true },
              apiKeys: { openai: { key: 'sk-org' } }, // Only org has openai
            }),
          });
        }
        // User document - has anthropic key
        return Promise.resolve({
          exists: () => true,
          data: () => ({ apiKeys: { anthropic: { key: 'sk-user' } } }),
        });
      });

      const sources = await getKeySourceInfo(mockDb, mockUserId, mockOrgId);

      expect(sources.openai).toBe('org');
      expect(sources.anthropic).toBe('user');
      expect(sources.gemini).toBe(null);
    });
  });
});
