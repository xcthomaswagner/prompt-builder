/**
 * Unit tests for keyTester service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testApiKey, testAllKeys, getKeyStatus, maskApiKey } from './keyTester';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('keyTester', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('testApiKey', () => {
    it('should return invalid for empty key', async () => {
      const result = await testApiKey('openai', '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return invalid for whitespace-only key', async () => {
      const result = await testApiKey('openai', '   ');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for unknown provider', async () => {
      const result = await testApiKey('unknown', 'some-key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown provider');
    });

    describe('OpenAI', () => {
      it('should return valid for successful response', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });
        
        const result = await testApiKey('openai', 'sk-test-key');
        
        expect(result.valid).toBe(true);
        expect(result.error).toBe(null);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/models',
          expect.objectContaining({
            headers: { 'Authorization': 'Bearer sk-test-key' }
          })
        );
      });

      it('should return invalid for 401 response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
        });
        
        const result = await testApiKey('openai', 'sk-invalid-key');
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid');
      });

      it('should handle rate limiting', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({})
        });
        
        const result = await testApiKey('openai', 'sk-test-key');
        
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Rate limited');
      });
    });

    describe('Anthropic', () => {
      it('should return valid for successful response', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });
        
        const result = await testApiKey('anthropic', 'sk-ant-test-key');
        
        expect(result.valid).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.anthropic.com/v1/messages',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-api-key': 'sk-ant-test-key',
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            })
          })
        );
      });
    });

    describe('Gemini', () => {
      it('should return valid for successful response', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });
        
        const result = await testApiKey('gemini', 'AIza-test-key');
        
        expect(result.valid).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://generativelanguage.googleapis.com/v1/models?key=AIza-test-key'
        );
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await testApiKey('openai', 'sk-test-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('testAllKeys', () => {
    it('should test all provided keys', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // openai
        .mockResolvedValueOnce({ ok: true }) // anthropic
        .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) }); // gemini
      
      const results = await testAllKeys({
        openai: 'sk-test',
        anthropic: 'sk-ant-test',
        gemini: 'AIza-test'
      });
      
      expect(results.openai.valid).toBe(true);
      expect(results.anthropic.valid).toBe(true);
      expect(results.gemini.valid).toBe(false);
    });

    it('should handle missing keys', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      const results = await testAllKeys({
        openai: 'sk-test'
      });
      
      expect(results.openai.valid).toBe(true);
      expect(results.anthropic.valid).toBe(false);
      expect(results.anthropic.error).toContain('No key');
      expect(results.gemini.valid).toBe(false);
    });
  });

  describe('getKeyStatus', () => {
    it('should return valid for valid result', () => {
      expect(getKeyStatus({ valid: true })).toBe('valid');
    });

    it('should return invalid for invalid result', () => {
      expect(getKeyStatus({ valid: false, error: 'test' })).toBe('invalid');
    });

    it('should return untested for null/undefined', () => {
      expect(getKeyStatus(null)).toBe('untested');
      expect(getKeyStatus(undefined)).toBe('untested');
    });
  });

  describe('maskApiKey', () => {
    it('should mask middle of key', () => {
      const masked = maskApiKey('sk-proj-1234567890abcdef');
      // First 8 chars + asterisks + last 4 chars
      expect(masked.startsWith('sk-proj-')).toBe(true);
      expect(masked.endsWith('cdef')).toBe(true);
      expect(masked).toContain('*');
      expect(masked).not.toContain('1234567890ab');
    });

    it('should handle short keys', () => {
      expect(maskApiKey('short')).toBe('****');
      expect(maskApiKey('')).toBe('****');
      expect(maskApiKey(null)).toBe('****');
    });

    it('should show first 8 and last 4 characters', () => {
      const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz';
      const masked = maskApiKey(key);
      expect(masked.startsWith('sk-proj-')).toBe(true);
      expect(masked.endsWith('wxyz')).toBe(true);
    });
  });
});
