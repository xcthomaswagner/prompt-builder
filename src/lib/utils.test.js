/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { generateSignature, formatTimestamp, truncateText, debounce } from './utils.js';

describe('utils', () => {
  describe('generateSignature', () => {
    it('should generate consistent hash for same text', () => {
      const text = 'Hello world';
      const sig1 = generateSignature(text);
      const sig2 = generateSignature(text);
      expect(sig1).toBe(sig2);
    });

    it('should generate different hashes for different text', () => {
      const sig1 = generateSignature('Hello world');
      const sig2 = generateSignature('Goodbye world');
      expect(sig1).not.toBe(sig2);
    });

    it('should handle empty string', () => {
      expect(generateSignature('')).toBe('0');
    });
  });

  describe('formatTimestamp', () => {
    it('should format Date object', () => {
      const date = new Date('2024-12-01T10:30:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toMatch(/Dec 1, 2024/);
    });

    it('should handle timestamp in milliseconds', () => {
      const timestamp = new Date('2024-12-01T10:30:00').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/Dec 1, 2024/);
    });

    it('should return empty string for null/undefined', () => {
      expect(formatTimestamp(null)).toBe('');
      expect(formatTimestamp(undefined)).toBe('');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated';
      const result = truncateText(text, 20);
      expect(result).toBe('This is a very long...');
    });

    it('should return short text unchanged', () => {
      const text = 'Short text';
      const result = truncateText(text, 20);
      expect(result).toBe(text);
    });

    it('should handle empty/null text', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText(null, 10)).toBe(null);
    });
  });

  describe('debounce', () => {
    it('should delay function execution', (done) => {
      let called = false;
      const debouncedFn = debounce(() => {
        called = true;
        done();
      }, 50);
      
      debouncedFn();
      expect(called).toBe(false);
    });
  });
});
